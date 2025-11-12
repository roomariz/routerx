// src/infrastructure/config/compatibility.js
// Utility helpers that translate legacy configuration keys to the current schema

const LEGACY_MAPPINGS = [
  { from: 'requestTimeout', to: 'timeout' },
  { from: 'requestTimeoutMs', to: 'timeout' },
  { from: 'retry.maxAttempts', to: 'resilience.maxRetries' },
  { from: 'retry.baseDelay', to: 'resilience.baseDelayMs' },
  { from: 'retry.maxDelay', to: 'resilience.maxDelayMs' },
  { from: 'retry.jitter', to: 'resilience.jitterMs' },
  { from: 'breaker.threshold', to: 'resilience.breakerThreshold' },
  { from: 'breaker.cooldown', to: 'resilience.breakerCooldownMs' },
  { from: 'breaker.halfOpenSuccesses', to: 'resilience.breakerHalfOpenSuccesses' },
  { from: 'breaker.halfOpenFailures', to: 'resilience.breakerHalfOpenFailures' },
  { from: 'features.asyncLogging', to: 'features.monitoringAsyncLogging' },
  { from: 'features.logSampling', to: 'features.monitoringLogSampling' },
  { from: 'features.successMetrics', to: 'features.successMetricsTracking' }
];

function cloneConfig(config = {}) {
  try {
    return JSON.parse(JSON.stringify(config));
  } catch {
    return { ...config };
  }
}

function getPath(target, path) {
  if (!target || typeof target !== 'object') {
    return undefined;
  }
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }
    return acc[key];
  }, target);
}

function ensureContainer(target, key) {
  if (!Object.prototype.hasOwnProperty.call(target, key) || typeof target[key] !== 'object' || target[key] === null) {
    target[key] = {};
  }
  return target[key];
}

function setPath(target, path, value) {
  const keys = path.split('.');
  let cursor = target;

  for (let i = 0; i < keys.length - 1; i += 1) {
    cursor = ensureContainer(cursor, keys[i]);
  }

  cursor[keys[keys.length - 1]] = value;
}

function deletePath(target, path) {
  const keys = path.split('.');
  let cursor = target;
  const stack = [];

  for (let i = 0; i < keys.length - 1; i += 1) {
    if (!cursor || typeof cursor !== 'object') {
      return;
    }
    stack.push({ parent: cursor, key: keys[i] });
    cursor = cursor[keys[i]];
  }

  if (cursor && typeof cursor === 'object') {
    delete cursor[keys[keys.length - 1]];
  }

  // Cleanup empty containers to avoid leaving sparse objects behind
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const { parent, key } = stack[i];
    if (parent[key] && Object.keys(parent[key]).length === 0) {
      delete parent[key];
    }
  }
}

export function applyConfigCompatibility(config = {}) {
  const adjustedConfig = cloneConfig(config);
  const notices = [];

  for (const mapping of LEGACY_MAPPINGS) {
    const legacyValue = getPath(adjustedConfig, mapping.from);
    const alreadyDefined = getPath(adjustedConfig, mapping.to);

    if (legacyValue === undefined || alreadyDefined !== undefined) {
      continue;
    }

    setPath(adjustedConfig, mapping.to, legacyValue);
    deletePath(adjustedConfig, mapping.from);
    notices.push({
      from: mapping.from,
      to: mapping.to
    });
  }

  return { config: adjustedConfig, notices };
}
