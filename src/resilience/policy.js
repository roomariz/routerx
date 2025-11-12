// src/resilience/policy.js
const ENV_KEYS = {
  maxRetries: 'ROUTERX_MAX_RETRIES',
  timeoutMs: 'ROUTERX_TIMEOUT_MS',
  baseDelayMs: 'ROUTERX_RETRY_BASE_DELAY_MS',
  maxDelayMs: 'ROUTERX_RETRY_MAX_DELAY_MS',
  jitterMs: 'ROUTERX_RETRY_JITTER_MS',
  breakerThreshold: 'ROUTERX_BREAKER_THRESHOLD',
  breakerCooldownMs: 'ROUTERX_BREAKER_COOLDOWN_MS',
  breakerHalfOpenSuccesses: 'ROUTERX_BREAKER_HALF_OPEN_SUCCESSES',
  breakerHalfOpenFailures: 'ROUTERX_BREAKER_HALF_OPEN_FAILURES'
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const toPositiveInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const clampDelay = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return Math.min(Math.max(value, minimum), maximum);
};

const sanitizeConfig = (config) => {
  const resolved = { ...config };

  resolved.timeoutMs = clampDelay(resolved.timeoutMs, 1);
  resolved.maxRetries = toPositiveInt(resolved.maxRetries) ?? 0;
  resolved.baseDelayMs = clampDelay(resolved.baseDelayMs, 1);
  resolved.maxDelayMs = clampDelay(resolved.maxDelayMs, resolved.baseDelayMs);
  resolved.jitterMs = clampDelay(resolved.jitterMs, 0);
  resolved.breakerThreshold = toPositiveInt(resolved.breakerThreshold) ?? 1;
  resolved.breakerCooldownMs = clampDelay(resolved.breakerCooldownMs, 1);
  resolved.breakerHalfOpenSuccesses = toPositiveInt(resolved.breakerHalfOpenSuccesses) ?? 1;
  resolved.breakerHalfOpenFailures = toPositiveInt(resolved.breakerHalfOpenFailures) ?? 1;

  return resolved;
};

export class ResiliencePolicy {
  constructor(baseConfig = {}, overrides = {}) {
    this.baseConfig = baseConfig;
    this.overrides = overrides;
    this.config = this.buildConfig();
  }

  buildConfig() {
    const resilienceDefaults = this.baseConfig.resilience ?? {};

    const defaults = {
      timeoutMs: resilienceDefaults.timeoutMs ?? this.baseConfig.timeout ?? 30000,
      maxRetries: resilienceDefaults.maxRetries ?? this.baseConfig.maxRetries ?? 3,
      baseDelayMs: resilienceDefaults.baseDelayMs ?? 1000,
      maxDelayMs: resilienceDefaults.maxDelayMs ?? 8000,
      jitterMs: resilienceDefaults.jitterMs ?? 250,
      breakerThreshold: resilienceDefaults.breakerThreshold ?? 5,
      breakerCooldownMs: resilienceDefaults.breakerCooldownMs ?? 60000,
      breakerHalfOpenSuccesses: resilienceDefaults.breakerHalfOpenSuccesses ?? 1,
      breakerHalfOpenFailures: resilienceDefaults.breakerHalfOpenFailures ?? 1
    };

    const withEnvOverrides = this.applyEnvOverrides(defaults);
    const withRuntimeOverrides = this.applyRuntimeOverrides(withEnvOverrides);

    return sanitizeConfig(withRuntimeOverrides);
  }

  applyEnvOverrides(target) {
    const result = { ...target };
    const env = process?.env ?? {};

    Object.entries(ENV_KEYS).forEach(([key, envKey]) => {
      const value = env[envKey];
      if (value === undefined) {
        return;
      }

      if (key === 'maxRetries' || key.startsWith('breaker')) {
        const parsed = toPositiveInt(value);
        if (parsed !== undefined) {
          result[key] = parsed;
        }
        return;
      }

      const parsed = toPositiveNumber(value);
      if (parsed !== undefined) {
        result[key] = parsed;
      }
    });

    return result;
  }

  applyRuntimeOverrides(target) {
    const result = { ...target };

    Object.entries(this.overrides || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (key === 'maxRetries' || key.startsWith('breaker')) {
        const parsed = toPositiveInt(value);
        if (parsed !== undefined) {
          result[key] = parsed;
        }
        return;
      }

      const parsed = toPositiveNumber(value);
      if (parsed !== undefined) {
        result[key] = parsed;
      }
    });

    return result;
  }

  getRetryOptions(additional = {}) {
    const {
      maxRetries,
      baseDelayMs,
      maxDelayMs,
      jitterMs,
      timeoutMs
    } = this.config;

    return {
      maxRetries,
      baseDelay: baseDelayMs,
      maxDelay: maxDelayMs,
      jitter: jitterMs,
      deadlineMs: timeoutMs,
      ...additional
    };
  }

  getBreakerOptions(additional = {}) {
    const {
      breakerThreshold,
      breakerCooldownMs,
      breakerHalfOpenSuccesses,
      breakerHalfOpenFailures
    } = this.config;

    return {
      threshold: breakerThreshold,
      cooldownMs: breakerCooldownMs,
      halfOpenMaxSuccesses: breakerHalfOpenSuccesses,
      halfOpenMaxFailures: breakerHalfOpenFailures,
      ...additional
    };
  }

  getTimeoutMs() {
    return this.config.timeoutMs;
  }

  toJSON() {
    return { ...this.config };
  }
}

export function createResiliencePolicy(baseConfig = {}, overrides = {}) {
  return new ResiliencePolicy(baseConfig, overrides);
}

export { ENV_KEYS as RESILIENCE_ENV_KEYS };

export function resolveResilienceOverridesFromOptions(options = {}) {
  if (!options || typeof options !== 'object') {
    return {};
  }

  const mapping = {
    timeout: 'timeoutMs',
    timeoutMs: 'timeoutMs',
    maxRetries: 'maxRetries',
    retryBaseDelay: 'baseDelayMs',
    retryBaseDelayMs: 'baseDelayMs',
    retryMaxDelay: 'maxDelayMs',
    retryMaxDelayMs: 'maxDelayMs',
    retryJitter: 'jitterMs',
    retryJitterMs: 'jitterMs',
    breakerThreshold: 'breakerThreshold',
    breakerCooldown: 'breakerCooldownMs',
    breakerCooldownMs: 'breakerCooldownMs',
    breakerHalfOpenSuccesses: 'breakerHalfOpenSuccesses',
    breakerHalfOpenFailures: 'breakerHalfOpenFailures'
  };

  const resolved = {};

  Object.entries(mapping).forEach(([optionKey, policyKey]) => {
    if (!(optionKey in options)) {
      return;
    }

    const rawValue = options[optionKey];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return;
    }

    const numeric = Number(rawValue);
    if (Number.isFinite(numeric)) {
      resolved[policyKey] = numeric;
    }
  });

  return resolved;
}

