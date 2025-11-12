import chalk from 'chalk';
import dayjs from 'dayjs';
import pkg from '../../package.json' with { type: 'json' };
import { featureFlags } from '../shared/utils/featureFlags.js';

const LEVEL_MAP = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LEVELS = Object.keys(LEVEL_MAP);

const BASE_SAMPLE_RATES = {
  debug: 1,
  info: 1,
  warn: 1,
  error: 1
};

const SAMPLED_DEFAULTS = {
  ...BASE_SAMPLE_RATES,
  debug: 0.35
};

function resolveSampleRatesFromEnv() {
  return LEVELS.reduce((acc, level) => {
    const envKey = `ROUTERX_LOG_SAMPLE_${level.toUpperCase()}`;
    if (!(envKey in process.env)) {
      return acc;
    }

    const parsed = Number(process.env[envKey]);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(Math.max(parsed, 0), 1);
      acc[level] = clamped;
    }

    return acc;
  }, {});
}

const envSampleRates = resolveSampleRatesFromEnv();
const envAsyncLogging = resolveEnvBoolean(
  process.env.ROUTERX_LOG_ASYNC ?? process.env.ROUTERX_ENABLE_ASYNC_LOGGING
);
const initialAsyncLogging = envAsyncLogging ?? featureFlags.isEnabled('monitoringAsyncLogging');
const initialSampleRates = featureFlags.isEnabled('monitoringLogSampling')
  ? { ...SAMPLED_DEFAULTS, ...envSampleRates }
  : { ...BASE_SAMPLE_RATES, ...envSampleRates };

function normalizeLevel(level) {
  if (typeof level !== 'string') {
    return 'info';
  }

  const lower = level.toLowerCase();
  return LEVELS.includes(lower) ? lower : 'info';
}

function createSafeReplacer() {
  const seen = new WeakSet();

  return (_key, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'function') {
      return value.name || '[Function]';
    }

    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }

      seen.add(value);
    }

    return value;
  };
}

function sanitizeControlCharacters(str) {
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\r\n/g, '\\r\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

class Logger {
  constructor(levelOrOptions = 'info', enableJsonOutput = false, defaultMeta = {}) {
    let options;
    if (typeof levelOrOptions === 'object' && levelOrOptions !== null && !Array.isArray(levelOrOptions)) {
      options = levelOrOptions;
    } else {
      options = {
        level: levelOrOptions,
        enableJsonOutput,
        defaultMeta,
        colorize: !enableJsonOutput
      };
    }

    this.level = normalizeLevel(options.level ?? 'info');
    this.enableJsonOutput = Boolean(options.enableJsonOutput);
    this.defaultMeta = { ...options.defaultMeta };
    this.colorize = options.colorize ?? !this.enableJsonOutput;
    this.stream = typeof options.stream === 'function' ? options.stream : console.log;
    this.asyncLogging = options.asyncLogging ?? initialAsyncLogging;
    this.queueMaxLength = Number.isFinite(options.queueMaxLength) ? options.queueMaxLength : 1000;
    this.sampleRates = this.normalizeSampleRates(options.sampleRates ?? initialSampleRates);
    this.queue = [];
    this.flushScheduled = false;
    this.droppedLogCount = 0;
  }

  setLevel(level) {
    this.level = normalizeLevel(level);
  }

  setJsonOutput(enable) {
    this.enableJsonOutput = Boolean(enable);
    if (enable) {
      this.colorize = false;
    }
  }

  setColorize(enable) {
    this.colorize = Boolean(enable);
  }

  setAsyncLogging(enable) {
    this.asyncLogging = Boolean(enable);
  }

  setSampleRates(sampleRates = {}) {
    this.sampleRates = this.normalizeSampleRates(sampleRates);
  }

  normalizeSampleRates(sampleRates = {}) {
    const normalized = {};
    LEVELS.forEach((level) => {
      if (sampleRates[level] === undefined) {
        const existing = this.sampleRates?.[level];
        normalized[level] = existing === undefined ? 1 : existing;
        return;
      }

      const parsed = Number(sampleRates[level]);
      normalized[level] = Number.isFinite(parsed)
        ? Math.min(Math.max(parsed, 0), 1)
        : 1;
    });
    return normalized;
  }

  shouldSample(level) {
    const rate = this.sampleRates?.[level] ?? 1;
    if (rate >= 1) {
      return true;
    }
    if (rate <= 0) {
      return false;
    }
    return Math.random() < rate;
  }

  withDefaultMeta(meta = {}) {
    this.defaultMeta = { ...this.defaultMeta, ...meta };
  }

  child(meta = {}) {
    return new Logger({
      level: this.level,
      enableJsonOutput: this.enableJsonOutput,
      defaultMeta: { ...this.defaultMeta, ...meta },
      colorize: this.colorize,
      stream: this.stream,
      asyncLogging: this.asyncLogging,
      sampleRates: { ...this.sampleRates },
      queueMaxLength: this.queueMaxLength
    });
  }

  shouldLog(level) {
    const targetLevel = normalizeLevel(level);
    if (LEVEL_MAP[targetLevel] < LEVEL_MAP[this.level]) {
      return false;
    }
    return this.shouldSample(targetLevel);
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const combinedMeta = this.prepareMeta(meta);
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: normalizeLevel(level),
      message,
      ...combinedMeta
    };

    if (this.asyncLogging) {
      this.enqueueLog(logEntry);
      return;
    }

    this.outputLog(logEntry);
  }

  enqueueLog(entry) {
    if (this.queue.length >= this.queueMaxLength) {
      this.queue.shift();
      this.droppedLogCount += 1;
    }

    this.queue.push(entry);
    if (this.flushScheduled) {
      return;
    }

    this.flushScheduled = true;
    const scheduler = typeof setImmediate === 'function'
      ? setImmediate
      : (fn) => setTimeout(fn, 0);
    scheduler(() => this.flushQueue());
  }

  flushQueue() {
    const pending = this.queue.splice(0);
    this.flushScheduled = false;
    pending.forEach((entry) => this.outputLog(entry));
  }

  flush() {
    if (this.queue.length === 0) {
      return;
    }
    this.flushQueue();
  }

  outputLog(logEntry) {
    if (this.enableJsonOutput) {
      try {
        const replacer = createSafeReplacer();
        this.stream(JSON.stringify(logEntry, replacer));
      } catch (error) {
        this.stream(JSON.stringify({
          timestamp: logEntry.timestamp,
          level: 'error',
          message: 'Failed to serialize log entry',
          error: error.message
        }));
      }
      return;
    }

    const timestamp = this.formatTimestamp(logEntry.timestamp);
    const levelLabel = this.getLevelLabel(logEntry.level);
    const { message, ...rest } = logEntry;
    const meta = { ...rest };
    delete meta.timestamp;
    delete meta.level;

    if (Object.keys(meta).length > 0) {
      const metaString = this.formatMetaForConsole(meta);
      this.stream(`${timestamp} [${levelLabel}] ${message}`, metaString);
    } else {
      this.stream(`${timestamp} [${levelLabel}] ${message}`);
    }
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  formatTimestamp(timestamp) {
    const ts = timestamp
      ? dayjs(timestamp).format('HH:mm:ss')
      : dayjs().format('HH:mm:ss');
    if (!this.colorize) {
      return ts;
    }

    return chalk.dim(ts);
  }

  getLevelLabel(level) {
    const normalized = normalizeLevel(level);
    const label = normalized.toUpperCase();

    if (!this.colorize) {
      return label;
    }

    switch (normalized) {
      case 'error':
        return chalk.red(label);
      case 'warn':
        return chalk.yellow(label);
      case 'info':
        return chalk.blue(label);
      case 'debug':
        return chalk.gray(label);
      default:
        return chalk.white(label);
    }
  }

  prepareMeta(meta) {
    if (!meta || typeof meta !== 'object') {
      return { ...this.defaultMeta };
    }

    const sanitizedMeta = {};
    const source = { ...this.defaultMeta, ...meta };

    for (const [key, value] of Object.entries(source)) {
      if (value === undefined) {
        continue;
      }

      if (value instanceof Error) {
        sanitizedMeta[key] = {
          name: value.name,
          message: value.message,
          stack: value.stack
        };
        continue;
      }

      if (typeof value === 'bigint') {
        sanitizedMeta[key] = value.toString();
        continue;
      }

      if (typeof value === 'function') {
        sanitizedMeta[key] = value.name || '[Function]';
        continue;
      }

      sanitizedMeta[key] = value;
    }

    return sanitizedMeta;
  }

  formatMetaForConsole(meta) {
    try {
      const replacer = createSafeReplacer();
      const stringified = JSON.stringify(meta, replacer);
      return sanitizeControlCharacters(stringified).substring(0, 2000);
    } catch (error) {
      return JSON.stringify({
        error: 'Could not serialize log metadata',
        reason: error.message
      });
    }
  }
}

function resolveEnvBoolean(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === '1' || value === 'true' || value === 'TRUE') {
    return true;
  }

  if (value === '0' || value === 'false' || value === 'FALSE') {
    return false;
  }

  return undefined;
}

const envLevel = normalizeLevel(
  process.env.ROUTERX_LOG_LEVEL ||
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
);

const envFormat = (process.env.ROUTERX_LOG_FORMAT || '').toLowerCase();
const envJsonToggle = resolveEnvBoolean(process.env.ROUTERX_ENABLE_JSON_LOGS);
const enableJsonOutput = envJsonToggle ?? (envFormat === 'json' || (envFormat === '' && process.env.NODE_ENV === 'production'));

const envColorToggle = resolveEnvBoolean(process.env.ROUTERX_LOG_COLOR);
const noColor = resolveEnvBoolean(process.env.NO_COLOR);
const colorize = enableJsonOutput
  ? false
  : (envColorToggle ?? (noColor === undefined ? true : !noColor));

const defaultMeta = {
  environment: process.env.NODE_ENV || 'development',
  pid: process.pid,
  version: pkg.version,
  app: pkg.name
};

const logger = new Logger({
  level: envLevel,
  enableJsonOutput,
  defaultMeta,
  colorize,
  asyncLogging: initialAsyncLogging,
  sampleRates: initialSampleRates
});

featureFlags.subscribe((snapshot) => {
  const flags = snapshot?.flags || {};
  logger.setAsyncLogging(flags.monitoringAsyncLogging);
  const baseRates = flags.monitoringLogSampling
    ? { ...SAMPLED_DEFAULTS }
    : { ...BASE_SAMPLE_RATES };
  logger.setSampleRates({
    ...baseRates,
    ...envSampleRates
  });
});

if (typeof process?.on === 'function') {
  process.on('beforeExit', () => logger.flush());
}

export { Logger, logger };
