import chalk from 'chalk';
import dayjs from 'dayjs';
import pkg from '../../package.json' with { type: 'json' };

const LEVEL_MAP = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const LEVELS = Object.keys(LEVEL_MAP);

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
    if (typeof levelOrOptions === 'object' && levelOrOptions !== null && !Array.isArray(levelOrOptions)) {
      const options = levelOrOptions;
      this.level = normalizeLevel(options.level ?? 'info');
      this.enableJsonOutput = Boolean(options.enableJsonOutput);
      this.defaultMeta = { ...options.defaultMeta };
      this.colorize = options.colorize ?? !this.enableJsonOutput;
      this.stream = typeof options.stream === 'function' ? options.stream : console.log;
    } else {
      this.level = normalizeLevel(levelOrOptions ?? 'info');
      this.enableJsonOutput = Boolean(enableJsonOutput);
      this.defaultMeta = { ...defaultMeta };
      this.colorize = !this.enableJsonOutput;
      this.stream = console.log;
    }
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

  withDefaultMeta(meta = {}) {
    this.defaultMeta = { ...this.defaultMeta, ...meta };
  }

  child(meta = {}) {
    return new Logger({
      level: this.level,
      enableJsonOutput: this.enableJsonOutput,
      defaultMeta: { ...this.defaultMeta, ...meta },
      colorize: this.colorize,
      stream: this.stream
    });
  }

  shouldLog(level) {
    const targetLevel = normalizeLevel(level);
    return LEVEL_MAP[targetLevel] >= LEVEL_MAP[this.level];
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

    if (this.enableJsonOutput) {
      const replacer = createSafeReplacer();
      const payload = JSON.stringify(logEntry, replacer);
      this.stream(payload);
      return;
    }

    const timestamp = this.formatTimestamp();
    const levelLabel = this.getLevelLabel(level);

    if (Object.keys(combinedMeta).length > 0) {
      const metaString = this.formatMetaForConsole(combinedMeta);
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

  formatTimestamp() {
    const ts = dayjs().format('HH:mm:ss');
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
  colorize
});

export { Logger, logger };
