// src/shared/utils/featureFlags.js
// Lightweight feature flag registry to support gradual rollouts

const DEFAULT_FEATURE_FLAGS = {
  monitoringAsyncLogging: false,
  monitoringLogSampling: false,
  successMetricsTracking: true,
  resilienceTelemetry: true
};

const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);

function camelToEnvKey(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (TRUE_VALUES.has(normalized)) {
      return true;
    }
    if (FALSE_VALUES.has(normalized)) {
      return false;
    }
  }

  return fallback;
}

class FeatureFlagRegistry {
  constructor(defaultFlags = {}) {
    this.defaults = { ...defaultFlags };
    this.flags = { ...defaultFlags };
    this.sources = {};
    this.listeners = new Set();
    this.applyEnvOverrides();
  }

  applyEnvOverrides() {
    let changed = false;
    Object.keys(this.flags).forEach((flagName) => {
      const envKey = `ROUTERX_FEATURE_${camelToEnvKey(flagName)}`;
      if (!(envKey in process.env)) {
        return;
      }
      const parsed = normalizeBoolean(process.env[envKey], this.flags[flagName]);
      this.flags[flagName] = parsed;
      this.sources[flagName] = `env:${envKey}`;
      changed = true;
    });
    return changed;
  }

  configure(flags = {}, source = 'config') {
    if (!flags || typeof flags !== 'object') {
      return this.getSnapshot();
    }

    let changed = false;
    Object.entries(flags).forEach(([flagName, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      const normalized = normalizeBoolean(value, this.flags[flagName] ?? false);
      if (this.flags[flagName] === normalized) {
        return;
      }

      this.flags[flagName] = normalized;
      this.sources[flagName] = source;
      changed = true;
    });

    if (changed) {
      this.notify();
    }

    return this.getSnapshot();
  }

  reset(overrides = {}) {
    this.flags = { ...this.defaults, ...overrides };
    this.sources = {};
    this.applyEnvOverrides();
    this.notify();
    return this.getSnapshot();
  }

  isEnabled(flagName) {
    return Boolean(this.flags[flagName]);
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this.listeners.add(listener);
    // Emit current state immediately so subscribers receive initial snapshot
    try {
      listener(this.getSnapshot());
    } catch {
      // Ignore subscriber errors to avoid cascading failures
    }
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Continue notifying other listeners even if one fails
      }
    }
  }

  getSnapshot() {
    return {
      flags: { ...this.flags },
      sources: { ...this.sources },
      timestamp: new Date().toISOString()
    };
  }
}

const featureFlags = new FeatureFlagRegistry(DEFAULT_FEATURE_FLAGS);

export function configureFeatureFlags(flags = {}, options = {}) {
  return featureFlags.configure(flags, options.source ?? 'config');
}

export function resetFeatureFlags(overrides = {}) {
  return featureFlags.reset(overrides);
}

export { featureFlags, DEFAULT_FEATURE_FLAGS };
