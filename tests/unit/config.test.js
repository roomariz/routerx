// tests/unit/config.test.js
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadConfig, getDefaultConfig } from '../../src/config.js';

// Mock the modules that need to be mocked
jest.mock('fs');
jest.mock('os');

describe('Configuration Functions', () => {
  let originalCwd;

  beforeEach(() => {
    originalCwd = process.cwd;
    process.cwd = () => '/test/current/directory';
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  test('getDefaultConfig returns expected default configuration', () => {
    const defaultConfig = getDefaultConfig();

    expect(defaultConfig.defaultModel).toBe("openai/gpt-4o-mini");
    expect(defaultConfig.defaultBaseUrl).toBe("https://openrouter.ai/api/v1");
    expect(defaultConfig.defaultSavePath).toBe("./outputs");
    expect(defaultConfig.maxRetries).toBe(3);
    expect(defaultConfig.timeout).toBe(30000);
  });

  test('loadConfig returns default config when no config files exist', () => {
    // Mock fs.existsSync to return false for all config paths
    fs.existsSync = jest.fn().mockReturnValue(false);

    const config = loadConfig();

    expect(config).toEqual(getDefaultConfig());
    expect(fs.existsSync).toHaveBeenCalledTimes(2); // Should check both paths
  });

  test('loadConfig loads config from current directory first', () => {
    // Mock config file content
    const configFileContent = JSON.stringify({
      defaultModel: "custom/model",
      timeout: 60000
    });

    // Mock fs.existsSync to return true for current directory config
    fs.existsSync = jest.fn()
      .mockImplementation((filePath) => filePath.includes('config.json') && !filePath.includes('routerx-config.json'));
    
    fs.readFileSync = jest.fn().mockReturnValue(configFileContent);

    const config = loadConfig();

    expect(config.defaultModel).toBe("custom/model");
    expect(config.timeout).toBe(60000);
    // Should still have default values for non-overridden settings
    expect(config.defaultBaseUrl).toBe("https://openrouter.ai/api/v1");
  });

  test('loadConfig loads config from home directory if current directory config doesn\'t exist', () => {
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

    const config = loadConfig();

    expect(config.defaultModel).toBe("home/model");
  });

  test('loadConfig handles JSON parsing errors gracefully', () => {
    // Mock fs.existsSync to return true for config file
    fs.existsSync = jest.fn().mockReturnValue(true);
    
    // Mock fs.readFileSync to return invalid JSON
    fs.readFileSync = jest.fn().mockReturnValue('{ invalid json }');

    // Spy on console.warn to verify error handling
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const config = loadConfig();

    // Should return default config when JSON parsing fails
    expect(config).toEqual(getDefaultConfig());
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});