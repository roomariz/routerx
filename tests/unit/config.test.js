// tests/unit/config.test.js
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ConfigManager from '../../src/config/config.js';

// Mock the modules that need to be mocked
jest.mock('fs');
jest.mock('os');

describe('ConfigManager', () => {
  let configManager;
  let originalCwd;

  beforeEach(() => {
    configManager = new ConfigManager();
    originalCwd = process.cwd;
    process.cwd = () => '/test/current/directory';
  });

  afterEach(() => {
    process.cwd = originalCwd;
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
        expect.stringContaining('⚠️ Warning: Could not parse config file'),
        expect.stringContaining('Permission denied')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('mergeConfig', () => {
    test('merges default and loaded config correctly', () => {
      const defaultConfig = { 
        defaultModel: 'openai/gpt-4o-mini',
        timeout: 30000,
        otherOption: 'default' 
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
        timeout: 30000 
      };
      const loadedConfig = {};

      const merged = configManager.mergeConfig(defaultConfig, loadedConfig);

      expect(merged).toEqual(defaultConfig);
    });

    test('handles null loaded config', () => {
      const defaultConfig = { 
        defaultModel: 'openai/gpt-4o-mini',
        timeout: 30000 
      };
      const loadedConfig = null;

      const merged = configManager.mergeConfig(defaultConfig, loadedConfig);

      expect(merged).toEqual(defaultConfig);
    });
  });
});