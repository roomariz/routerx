// src/infrastructure/config/configManager.js
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigValidator } from '../../monitoring/configValidator.js';
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
      timeout: 30000
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
      // Try to load config from multiple locations in order of preference:
      // 1. Current working directory: ./config.json
      // 2. User's home directory: ~/routerx-config.json
      // 3. Default values

      const homeDir = os.homedir();
      if (!homeDir) {
        // If os.homedir() returns null/undefined, only check current directory
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
          try {
            const configFile = fs.readFileSync(configPath, 'utf8');
            const parsedConfig = JSON.parse(configFile);

            // Validate and merge configuration
            const mergedConfig = this.mergeConfig(this.getDefaultConfig(), parsedConfig);
            ConfigValidator.validate(mergedConfig);
            logger.info('Configuration loaded successfully', { ...logContext, configPath });
            return mergedConfig;
          } catch (error) {
            logger.error('Configuration loading failed', {
              ...logContext,
              configPath,
              error: error.message
            });

            // Provide backward compatibility with tests expecting console.warn
            console.warn('⚠️ Warning: Could not parse config file', `'${configPath}': ${error.message}`);
            
            // If config validation fails, return default config
            logger.info('Using default configuration due to validation errors', logContext);
            return this.getDefaultConfig();
          }
        }
        // Return default config if no config file is found
        logger.info('Using default configuration', logContext);
        return this.getDefaultConfig();
      }

      const configPaths = [
        path.join(process.cwd(), 'config.json'),
        path.join(homeDir, 'routerx-config.json')
      ];

      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          try {
            const configFile = fs.readFileSync(configPath, 'utf8');
            const parsedConfig = JSON.parse(configFile);

            // Validate and merge configuration
            const mergedConfig = this.mergeConfig(this.getDefaultConfig(), parsedConfig);
            ConfigValidator.validate(mergedConfig);
            logger.info('Configuration loaded successfully', { ...logContext, configPath });
            return mergedConfig;
          } catch (error) {
            logger.error('Configuration loading failed', {
              ...logContext,
              configPath,
              error: error.message
            });

            // Provide backward compatibility with tests expecting console.warn
            console.warn('⚠️ Warning: Could not parse config file', `'${configPath}': ${error.message}`);
            
            // If config validation fails, return default config
            logger.info('Using default configuration due to validation errors', logContext);
            return this.getDefaultConfig();
          }
        }
      }

      // Return default config if no config file is found
      logger.info('Using default configuration', logContext);
      return this.getDefaultConfig();
    } catch (error) {
      logger.error('Configuration loading failed, using defaults', {
        ...logContext,
        error: error.message
      });
      return this.getDefaultConfig();
    }
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

    // Only merge properties that exist in the default config
    for (const [key, value] of Object.entries(loadedConfig)) {
      if (key in defaultConfig) {
        merged[key] = value;
      }
    }

    return merged;
  }
}

export default ConfigManager;