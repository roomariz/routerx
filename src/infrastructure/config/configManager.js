// src/infrastructure/config/configManager.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigValidator } from '../../config/index.js';
import { logger } from '../../monitoring/logger.js';
import { createRouterXError } from '../../shared/utils/error.js';

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

    try {
      const configPaths = this.getConfigPaths();

      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          const loadedConfig = this.loadConfigFromPath(configPath, logContext);
          if (loadedConfig) {
            return loadedConfig;
          }
          return this.getDefaultConfig();
        }
      }

      logger.info('Using default configuration', logContext);
      return this.getDefaultConfig();
    } catch (error) {
      logger.error('Configuration loading failed, using defaults', {
        ...logContext,
        error: this.sanitizeErrorMessage(error)
      });
      if (this.isValidationError(error)) {
        throw error;
      }
      return this.getDefaultConfig();
    }
  }

  /**
   * Determine the configuration paths to evaluate.
   * @returns {string[]} Candidate configuration file paths.
   */
  getConfigPaths() {
    const paths = [path.join(process.cwd(), 'config.json')];
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
      this.handleConfigLoadError(error, configPath, logContext);
      return null;
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
    const warningPrefix = this.isValidationError(error)
      ? '?? Validation error in config file'
      : '?? Warning: Could not parse config file';

    console.warn(warningPrefix, `'${configPath}': ${sanitizedErrorMessage}`);

    if (this.isValidationError(error)) {
      throw this.createValidationFailureError(error, configPath);
    }

    logger.info('Using default configuration due to config file errors', logContext);
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

  /**
   * Merge default config with loaded config, ensuring all required fields are present
   * @param {Object} defaultConfig - Default configuration values
   * @param {Object} loadedConfig - Configuration loaded from file
   * @returns {Object} Merged configuration
   */
  mergeConfig(defaultConfig, loadedConfig) {
    if (!loadedConfig) {
      return { ...defaultConfig };
    }

    const merged = { ...defaultConfig };

    for (const [key, value] of Object.entries(loadedConfig)) {
      if (!(key in defaultConfig)) {
        continue;
      }

      if (key === 'resilience' && value && typeof value === 'object') {
        merged.resilience = {
          ...defaultConfig.resilience,
          ...value
        };
        continue;
      }

      merged[key] = value;
    }

    merged.resilience = merged.resilience || { ...defaultConfig.resilience };
    merged.resilience.timeoutMs = merged.resilience.timeoutMs ?? merged.timeout;
    merged.resilience.maxRetries = merged.resilience.maxRetries ?? merged.maxRetries;

    return merged;
  }
}

export default ConfigManager;
