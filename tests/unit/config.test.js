// tests/unit/config.test.js
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ConfigManager from '../../src/infrastructure/config/index.js';

// Mock the modules that need to be mocked
jest.mock('fs');
jest.mock('os');

// Mock the logger to suppress console output during tests
jest.mock('../../src/monitoring/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  Logger: jest.fn()
}));

describe('ConfigManager', () => {
  let configManager;
  let originalCwd;
  let envBackup;

  beforeEach(() => {
    configManager = new ConfigManager();
    originalCwd = process.cwd;
    process.cwd = () => '/test/current/directory';
    envBackup = { ...process.env };
  });

  afterEach(() => {
    process.cwd = originalCwd;
    for (const key of Object.keys(process.env)) {
      if (!(key in envBackup)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, envBackup);
  });

  describe('getDefaultConfig', () => {
    test('returns expected default configuration', () => {
      const defaultConfig = configManager.getDefaultConfig();

      expect(defaultConfig.defaultModel).toBe("openai/gpt-4o-mini");
      expect(defaultConfig.defaultBaseUrl).toBe("https://openrouter.ai/api/v1");
      expect(defaultConfig.defaultSavePath).toBe("./outputs");
      expect(defaultConfig.maxRetries).toBe(3);
      expect(defaultConfig.timeout).toBe(30000);
    });
  });

  describe('loadConfig', () => {
    test('returns default config when no config files exist', () => {
      // Mock os.homedir to return a valid path
      os.homedir = jest.fn().mockReturnValue('/home/user');
      // Mock fs.existsSync to return false for all config paths
      fs.existsSync = jest.fn().mockReturnValue(false);

      const config = configManager.loadConfig();

      expect(config).toEqual(configManager.getDefaultConfig());
      expect(fs.existsSync).toHaveBeenCalledTimes(2); // Should check both paths
    });

    test('loads config from current directory first', () => {
      // Mock config file content
      const configFileContent = JSON.stringify({
        defaultModel: "custom/model",
        timeout: 60000
      });

      // Mock fs.existsSync to return true for current directory config
      fs.existsSync = jest.fn()
        .mockImplementation((filePath) => filePath.includes('config.json') && !filePath.includes('routerx-config.json'));

      fs.readFileSync = jest.fn().mockReturnValue(configFileContent);

      const config = configManager.loadConfig();

      expect(config.defaultModel).toBe("custom/model");
      expect(config.timeout).toBe(60000);
      // Should still have default values for non-overridden settings
      expect(config.defaultBaseUrl).toBe("https://openrouter.ai/api/v1");
    });

    test('loads config from home directory if current directory config doesn\'t exist', () => {
      // Mock config file content
      const configFileContent = JSON.stringify({
        defaultModel: "home/model"
      });

      // Mock fs.existsSync to return true only for home directory config
      fs.existsSync = jest.fn()
        .mockImplementation((filePath) => filePath.includes('routerx-config.json'));

      fs.readFileSync = jest.fn().mockReturnValue(configFileContent);

      // Mock os.homedir
      os.homedir = jest.fn().mockReturnValue('/home/user');

      const config = configManager.loadConfig();

      expect(config.defaultModel).toBe("home/model");
    });

    test('handles JSON parsing errors gracefully', () => {
      // Mock fs.existsSync to return true for config file
      fs.existsSync = jest.fn().mockReturnValue(true);

      // Mock fs.readFileSync to return invalid JSON
      fs.readFileSync = jest.fn().mockReturnValue('{ invalid json }');

      // Spy on console.warn to verify error handling
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = configManager.loadConfig();

      // Should return default config when JSON parsing fails
      expect(config).toEqual(configManager.getDefaultConfig());
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('handles file read errors gracefully', () => {
      // Mock fs.existsSync to return true for config file
      fs.existsSync = jest.fn().mockReturnValue(true);

      // Mock fs.readFileSync to throw an error
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Spy on console.warn to verify error handling
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = configManager.loadConfig();

      // Should return default config when file reading fails
      expect(config).toEqual(configManager.getDefaultConfig());
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not parse config file'),
        expect.stringContaining('Permission denied')
      );

      consoleSpy.mockRestore();
    });

    test('throws when configuration file fails validation', () => {
      os.homedir = jest.fn().mockReturnValue('/home/user');
      fs.existsSync = jest.fn().mockImplementation((filePath) => filePath.includes('config.json'));
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        timeout: 0,
        resilience: {
          timeoutMs: -1
        }
      }));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => configManager.loadConfig()).toThrow(/failed validation/i);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation error in config file'),
        expect.stringContaining('timeout must be a positive number')
      );

      consoleSpy.mockRestore();
    });

    test('prioritizes ROUTERX_CONFIG_PATH when environment variable is set', () => {
      const customPath = path.resolve('/custom/routerx-config.json');
      process.env.ROUTERX_CONFIG_PATH = customPath;
      os.homedir = jest.fn().mockReturnValue('/home/user');

      fs.existsSync = jest.fn().mockImplementation((filePath) => filePath === customPath);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
        defaultModel: 'env-config/model'
      }));

      const config = configManager.loadConfig();

      expect(fs.existsSync).toHaveBeenCalledWith(customPath);
      expect(config.defaultModel).toBe('env-config/model');
    });

    test('applies environment overrides for configuration values', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      process.env.ROUTERX_DEFAULT_MODEL = 'env/model';
      process.env.ROUTERX_TIMEOUT = '45000';
      process.env.ROUTERX_RESILIENCE_MAX_RETRIES = '5';
      process.env.ROUTERX_RESILIENCE_BASE_DELAY_MS = '1500';

      const config = configManager.loadConfig();

      expect(config.defaultModel).toBe('env/model');
      expect(config.timeout).toBe(45000);
      expect(config.resilience.maxRetries).toBe(5);
      expect(config.resilience.baseDelayMs).toBe(1500);
    });
  });

  describe('mergeConfig', () => {
    const baseResilience = {
      timeoutMs: 30000,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      jitterMs: 250,
      breakerThreshold: 5,
      breakerCooldownMs: 60000,
      breakerHalfOpenSuccesses: 1,
      breakerHalfOpenFailures: 1
    };

    test('merges default and loaded config correctly', () => {
      const defaultConfig = { 
        defaultModel: 'openai/gpt-4o-mini',
        timeout: 30000,
        otherOption: 'default',
        resilience: { ...baseResilience }
      };
      const loadedConfig = { 
        defaultModel: 'custom/model',
        newOption: 'value'
      };

      const merged = configManager.mergeConfig(defaultConfig, loadedConfig);

      // Should override existing keys with loaded values
      expect(merged.defaultModel).toBe('custom/model');
      expect(merged.timeout).toBe(30000); // Keep default for non-overridden
      expect(merged.otherOption).toBe('default'); // Keep default for non-overridden
      // Should not add new keys not in default config
      expect(merged.newOption).toBeUndefined();
    });

    test('handles completely empty loaded config', () => {
      const defaultConfig = { 
        defaultModel: 'openai/gpt-4o-mini',
        timeout: 30000,
        resilience: { ...baseResilience }
      };
      const loadedConfig = {};

      const merged = configManager.mergeConfig(defaultConfig, loadedConfig);

      expect(merged).toEqual(defaultConfig);
    });

    test('handles null loaded config', () => {
      const defaultConfig = { 
        defaultModel: 'openai/gpt-4o-mini',
        timeout: 30000,
        resilience: { ...baseResilience }
      };
      const loadedConfig = null;

      const merged = configManager.mergeConfig(defaultConfig, loadedConfig);

      expect(merged).toEqual(defaultConfig);
    });
  });
});
