// src/infrastructure/config/configManager.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigValidator } from '../../config/index.js';
import { logger } from '../../monitoring/logger.js';
import { createRouterXError } from '../../shared/utils/error.js';
import { applyConfigCompatibility } from './compatibility.js';

/**
 * Configuration Manager for RouterX
 * Handles loading and managing application configuration
 */
class ConfigManager {
  constructor() {
    this.defaultConfig = {
      defaultModel: "openai/gpt-4o-mini",
      defaultBaseUrl: "https://openrouter.ai/api/v1",
      defaultSavePath: "./outputs",
      maxRetries: 3,
      timeout: 30000,
      resilience: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        jitterMs: 250,
        timeoutMs: 30000,
        breakerThreshold: 5,
        breakerCooldownMs: 60000,
        breakerHalfOpenSuccesses: 1,
        breakerHalfOpenFailures: 1
      },
      features: {
        monitoringAsyncLogging: false,
        monitoringLogSampling: false,
        successMetricsTracking: true,
        resilienceTelemetry: true
      },
      telemetry: {
        referer: 'https://routerx.sh',
        title: 'RouterX CLI'
      }
    };
  }

  /**
   * Get the default configuration
   * @returns {Object} Default configuration object
   */
  getDefaultConfig() {
    return this.defaultConfig;
  }

  /**
   * Load configuration from file or return defaults
   * @returns {Object} Loaded configuration object
   */
  loadConfig() {
    const logContext = { operation: 'loadConfig' };
    let activeConfig = this.cloneConfig(this.getDefaultConfig());

    try {
      const configPaths = this.getConfigPaths();

      for (const configPath of configPaths) {
        if (!fs.existsSync(configPath)) {
          continue;
        }

        const loadedConfig = this.loadConfigFromPath(configPath, logContext);
        if (loadedConfig) {
          activeConfig = loadedConfig;
          break;
        }
      }

      const compatibleConfig = this.applyCompatibilityLayer(activeConfig, logContext);
      const finalConfig = this.applyEnvironmentOverrides(compatibleConfig, logContext);
      ConfigValidator.validate(finalConfig);
      return finalConfig;
    } catch (error) {
      if (this.isValidationError(error)) {
        throw error;
      }

      logger.error('Unexpected error during configuration loading, using defaults', {
        ...logContext,
        error: this.sanitizeErrorMessage(error)
      });

      const fallbackCompatible = this.applyCompatibilityLayer(this.cloneConfig(this.getDefaultConfig()), logContext);
      const fallbackConfig = this.applyEnvironmentOverrides(fallbackCompatible, logContext);
      ConfigValidator.validate(fallbackConfig);
      return fallbackConfig;
    }
  }

  /**
   * Determine the configuration paths to evaluate.
   * @returns {string[]} Candidate configuration file paths.
   */
  getConfigPaths() {
    const explicitPath = process.env.ROUTERX_CONFIG_PATH
      ? path.resolve(process.env.ROUTERX_CONFIG_PATH)
      : null;

    const paths = explicitPath ? [explicitPath] : [];
    paths.push(path.join(process.cwd(), 'config.json'));
    const homeDir = os.homedir();

    if (homeDir) {
      paths.push(path.join(homeDir, 'routerx-config.json'));
    }

    return paths;
  }

  /**
   * Attempt to load and validate a configuration file.
   * @param {string} configPath - Path to the configuration file.
   * @param {Object} logContext - Logger context metadata.
   * @returns {Object|null} Loaded configuration or null if parsing failed.
   */
  loadConfigFromPath(configPath, logContext) {
    try {
      const configFile = fs.readFileSync(configPath, 'utf8');
      const parsedConfig = JSON.parse(configFile);

      const mergedConfig = this.mergeConfig(this.getDefaultConfig(), parsedConfig);
      ConfigValidator.validate(mergedConfig);
      logger.info('Configuration loaded successfully', { ...logContext, configPath });
      return mergedConfig;
    } catch (error) {
      return this.handleConfigLoadError(error, configPath, logContext);
    }
  }

  /**
   * Handle config parsing, IO, or validation errors with helpful output.
   * @param {Error} error - Error thrown while loading configuration.
   * @param {string} configPath - Path to the configuration file.
   * @param {Object} logContext - Logger context metadata.
   */
  handleConfigLoadError(error, configPath, logContext) {
    logger.error('Configuration loading failed', {
      ...logContext,
      configPath,
      error: this.sanitizeErrorMessage(error)
    });

    const sanitizedErrorMessage = this.sanitizeErrorMessage(error);
    const isValidationError = this.isValidationError(error);
    const warningPrefix = isValidationError
      ? 'Warning: Validation error in config file'
      : 'Warning: Could not parse config file';

    console.warn(warningPrefix, `'${configPath}': ${sanitizedErrorMessage}`);

    if (isValidationError) {
      throw this.createValidationFailureError(error, configPath);
    }

    logger.info('Trying next configuration path or using defaults due to config file errors', logContext);
    return null;
  }

  sanitizeErrorMessage(error) {
    return error?.message
      ? error.message.replace(/[\r\n\u0000-\u001F\u007F-\u009F]/g, '').substring(0, 500)
      : 'Unknown error';
  }

  isValidationError(error) {
    return error?.code === 'CONFIG_VALIDATION_ERROR' || error?.name === 'ConfigError';
  }

  createValidationFailureError(error, configPath) {
    const validationErrors = Array.isArray(error?.context?.errors) ? error.context.errors : [];
    const details = validationErrors.length > 0
      ? validationErrors.join(', ')
      : (error?.message || 'Unknown validation error');

    return createRouterXError(
      `Configuration file '${configPath}' failed validation: ${details}`,
      'CONFIG_VALIDATION_ERROR',
      {
        ...error?.context,
        configPath,
        originalMessage: error?.message
      },
      'config'
    );
  }

  cloneConfig(config) {
    const cloned = {
      ...config,
      resilience: config.resilience ? { ...config.resilience } : undefined
    };

    if (Object.prototype.hasOwnProperty.call(config, 'features')) {
      cloned.features = config.features ? { ...config.features } : config.features;
    }

    if (Object.prototype.hasOwnProperty.call(config, 'telemetry')) {
      cloned.telemetry = config.telemetry ? { ...config.telemetry } : config.telemetry;
    }

    return cloned;
  }

  mergeConfig(baseConfig, overrides) {
    if (!overrides || typeof overrides !== 'object') {
      return this.cloneConfig(baseConfig);
    }

    const merged = this.cloneConfig(baseConfig);

    for (const [key, value] of Object.entries(overrides)) {
      if (!(key in baseConfig)) {
        continue;
      }

      if (key === 'resilience' && value && typeof value === 'object') {
        merged.resilience = {
          ...merged.resilience,
          ...value
        };
        continue;
      }

      if (key === 'features' && value && typeof value === 'object') {
        merged.features = {
          ...merged.features,
          ...value
        };
        continue;
      }

      if (key === 'telemetry' && value && typeof value === 'object') {
        merged.telemetry = {
          ...merged.telemetry,
          ...value
        };
        continue;
      }

      if (value !== undefined) {
        merged[key] = value;
      }
    }

    if (baseConfig.resilience) {
      merged.resilience = merged.resilience || { ...baseConfig.resilience };
      if (merged.resilience) {
        merged.resilience.timeoutMs = merged.resilience.timeoutMs ?? merged.timeout;
        merged.resilience.maxRetries = merged.resilience.maxRetries ?? merged.maxRetries;
      }
    } else {
      delete merged.resilience;
    }

    if (Object.prototype.hasOwnProperty.call(baseConfig, 'features')) {
      if (merged.features) {
        const baseFeatures = baseConfig.features ? { ...baseConfig.features } : {};
        merged.features = {
          ...baseFeatures,
          ...merged.features
        };
      } else if (baseConfig.features) {
        merged.features = { ...baseConfig.features };
      } else {
        merged.features = baseConfig.features;
      }
    } else {
      delete merged.features;
    }

    if (Object.prototype.hasOwnProperty.call(baseConfig, 'telemetry')) {
      if (merged.telemetry) {
        const baseTelemetry = baseConfig.telemetry ? { ...baseConfig.telemetry } : {};
        merged.telemetry = {
          ...baseTelemetry,
          ...merged.telemetry
        };
      } else if (baseConfig.telemetry) {
        merged.telemetry = { ...baseConfig.telemetry };
      } else {
        merged.telemetry = baseConfig.telemetry;
      }
    } else {
      delete merged.telemetry;
    }

    return merged;
  }

  applyEnvironmentOverrides(config, logContext) {
    const { overrides, appliedKeys } = this.getEnvironmentOverrides();
    if (appliedKeys.length === 0) {
      return config;
    }

    const mergedConfig = this.mergeConfig(config, overrides);
    logger.info('Applied environment configuration overrides', {
      ...logContext,
      appliedEnvKeys: appliedKeys
    });

    return mergedConfig;
  }

  applyCompatibilityLayer(config, logContext) {
    try {
      const { config: adjustedConfig, notices } = applyConfigCompatibility(config);
      if (Array.isArray(notices) && notices.length > 0) {
        logger.warn('Applied legacy configuration mappings', {
          ...logContext,
          compatibilityNotices: notices
        });
      }
      return adjustedConfig;
    } catch (error) {
      logger.warn('Failed to apply compatibility layer', {
        ...logContext,
        error: this.sanitizeErrorMessage(error)
      });
      return config;
    }
  }

  getEnvironmentOverrides() {
    const overrides = {};
    const resilienceOverrides = {};
    const featureOverrides = {};
    const telemetryOverrides = {};
    const appliedKeys = [];

    const assignString = (envKey, targetKey) => {
      const value = process.env[envKey];
      if (typeof value === 'string' && value.trim() !== '') {
        if (targetKey.startsWith('telemetry.')) {
          const key = targetKey.split('.')[1];
          telemetryOverrides[key] = value.trim();
        } else {
          overrides[targetKey] = value.trim();
        }
        appliedKeys.push(envKey);
      }
    };

    const assignNumber = (envKey, targetKey, { integer = false } = {}) => {
      const parsed = this.parseNumericEnv(envKey, { integer });
      if (parsed === undefined) {
        return;
      }

      if (targetKey.startsWith('resilience.')) {
        const key = targetKey.split('.')[1];
        resilienceOverrides[key] = parsed;
      } else {
        overrides[targetKey] = parsed;
      }

      appliedKeys.push(envKey);
    };

    const assignBoolean = (envKey, targetKey) => {
      const parsed = this.parseBooleanEnv(envKey);
      if (parsed === undefined) {
        return;
      }

      if (targetKey.startsWith('features.')) {
        const key = targetKey.split('.')[1];
        featureOverrides[key] = parsed;
      } else {
        overrides[targetKey] = parsed;
      }

      appliedKeys.push(envKey);
    };

    assignString('ROUTERX_DEFAULT_MODEL', 'defaultModel');
    assignString('ROUTERX_DEFAULT_BASE_URL', 'defaultBaseUrl');
    assignString('ROUTERX_DEFAULT_SAVE_PATH', 'defaultSavePath');
    assignString('ROUTERX_HTTP_REFERER', 'telemetry.referer');
    assignString('ROUTERX_CLIENT_TITLE', 'telemetry.title');

    assignNumber('ROUTERX_TIMEOUT', 'timeout', { integer: false });
    assignNumber('ROUTERX_MAX_RETRIES', 'maxRetries', { integer: true });

    assignNumber('ROUTERX_RESILIENCE_TIMEOUT_MS', 'resilience.timeoutMs', { integer: false });
    assignNumber('ROUTERX_RESILIENCE_MAX_RETRIES', 'resilience.maxRetries', { integer: true });
    assignNumber('ROUTERX_RESILIENCE_BASE_DELAY_MS', 'resilience.baseDelayMs', { integer: false });
    assignNumber('ROUTERX_RESILIENCE_MAX_DELAY_MS', 'resilience.maxDelayMs', { integer: false });
    assignNumber('ROUTERX_RESILIENCE_JITTER_MS', 'resilience.jitterMs', { integer: false });
    assignNumber('ROUTERX_RESILIENCE_BREAKER_THRESHOLD', 'resilience.breakerThreshold', { integer: true });
    assignNumber('ROUTERX_RESILIENCE_BREAKER_COOLDOWN_MS', 'resilience.breakerCooldownMs', { integer: false });
    assignNumber('ROUTERX_RESILIENCE_BREAKER_HALF_OPEN_SUCCESSES', 'resilience.breakerHalfOpenSuccesses', { integer: true });
    assignNumber('ROUTERX_RESILIENCE_BREAKER_HALF_OPEN_FAILURES', 'resilience.breakerHalfOpenFailures', { integer: true });

    assignBoolean('ROUTERX_FEATURE_MONITORING_ASYNC_LOGGING', 'features.monitoringAsyncLogging');
    assignBoolean('ROUTERX_FEATURE_MONITORING_LOG_SAMPLING', 'features.monitoringLogSampling');
    assignBoolean('ROUTERX_FEATURE_SUCCESS_METRICS', 'features.successMetricsTracking');
    assignBoolean('ROUTERX_FEATURE_RESILIENCE_TELEMETRY', 'features.resilienceTelemetry');

    if (Object.keys(resilienceOverrides).length > 0) {
      overrides.resilience = resilienceOverrides;
    }

    if (Object.keys(featureOverrides).length > 0) {
      overrides.features = featureOverrides;
    }

    if (Object.keys(telemetryOverrides).length > 0) {
      overrides.telemetry = telemetryOverrides;
    }

    return { overrides, appliedKeys };
  }

  parseNumericEnv(envKey, { integer = false } = {}) {
    if (!(envKey in process.env)) {
      return undefined;
    }

    const rawValue = process.env[envKey];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return undefined;
    }

    const parsed = integer ? Number.parseInt(rawValue, 10) : Number(rawValue);

    if (!Number.isFinite(parsed)) {
      logger.warn('Ignoring invalid numeric environment override', {
        operation: 'loadConfig',
        envKey,
        rawValue
      });
      return undefined;
    }

    return parsed;
  }

  parseBooleanEnv(envKey) {
    if (!(envKey in process.env)) {
      return undefined;
    }

    const rawValue = process.env[envKey];
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return undefined;
    }

    const normalized = rawValue.toString().trim().toLowerCase();

    if (['1', 'true', 'on', 'yes'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'off', 'no'].includes(normalized)) {
      return false;
    }

    logger.warn('Ignoring invalid boolean environment override', {
      operation: 'loadConfig',
      envKey,
      rawValue
    });

    return undefined;
  }

  createValidationFailureError(error, configPath) {
    const validationErrors = Array.isArray(error?.context?.errors) ? error.context.errors : [];
    const details = validationErrors.length > 0
      ? validationErrors.join(', ')
      : (error?.message || 'Unknown validation error');

    return createRouterXError(
      `Configuration file '${configPath}' failed validation: ${details}`,
      'CONFIG_VALIDATION_ERROR',
      {
        ...error?.context,
        configPath,
        originalMessage: error?.message
      },
      'config'
    );
  }
}

export default ConfigManager;
