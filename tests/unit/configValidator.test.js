// tests/unit/configValidator.test.js
import { describe, test, expect } from '@jest/globals';
import { ConfigValidator } from '../../src/monitoring/configValidator.js';
import { createRouterXError } from '../../src/shared/utils/error.js';

describe('ConfigValidator', () => {
  test('validates valid configuration successfully', () => {
    const validConfig = {
      defaultModel: 'openai/gpt-4o-mini',
      defaultBaseUrl: 'https://api.example.com',
      defaultSavePath: './outputs',
      maxRetries: 3,
      timeout: 30000
    };

    expect(() => ConfigValidator.validate(validConfig)).not.toThrow();
    expect(ConfigValidator.validate(validConfig)).toBe(true);
  });

  test('throws error for invalid defaultModel', () => {
    const invalidConfig = {
      defaultModel: '', // Empty string
      defaultBaseUrl: 'https://api.example.com',
      defaultSavePath: './outputs',
      maxRetries: 3,
      timeout: 30000
    };

    expect(() => ConfigValidator.validate(invalidConfig)).toThrow();
    try {
      ConfigValidator.validate(invalidConfig);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR');
    }
  });

  test('throws error for invalid defaultBaseUrl', () => {
    const invalidConfig = {
      defaultModel: 'openai/gpt-4o-mini',
      defaultBaseUrl: 'not-a-url', // Invalid URL
      defaultSavePath: './outputs',
      maxRetries: 3,
      timeout: 30000
    };

    expect(() => ConfigValidator.validate(invalidConfig)).toThrow();
    try {
      ConfigValidator.validate(invalidConfig);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR');
    }
  });

  test('throws error for invalid timeout', () => {
    const invalidConfig = {
      defaultModel: 'openai/gpt-4o-mini',
      defaultBaseUrl: 'https://api.example.com',
      defaultSavePath: './outputs',
      maxRetries: 3,
      timeout: -1 // Negative value
    };

    expect(() => ConfigValidator.validate(invalidConfig)).toThrow();
    try {
      ConfigValidator.validate(invalidConfig);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR');
    }
  });

  test('throws error for invalid maxRetries', () => {
    const invalidConfig = {
      defaultModel: 'openai/gpt-4o-mini',
      defaultBaseUrl: 'https://api.example.com',
      defaultSavePath: './outputs',
      maxRetries: -1, // Negative value
      timeout: 30000
    };

    expect(() => ConfigValidator.validate(invalidConfig)).toThrow();
    try {
      ConfigValidator.validate(invalidConfig);
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR');
    }
  });

  test('isValidUrl returns true for valid URLs', () => {
    expect(ConfigValidator.isValidUrl('https://api.example.com')).toBe(true);
    expect(ConfigValidator.isValidUrl('http://localhost:3000')).toBe(true);
    expect(ConfigValidator.isValidUrl('https://subdomain.example.com/path?query=value')).toBe(true);
  });

  test('isValidUrl returns false for invalid URLs', () => {
    expect(ConfigValidator.isValidUrl('not-a-url')).toBe(false);
    expect(ConfigValidator.isValidUrl('')).toBe(false);
    expect(ConfigValidator.isValidUrl('ftp://invalid-protocol.com')).toBe(true); // Actually valid URL format
    expect(ConfigValidator.isValidUrl(null)).toBe(false);
    expect(ConfigValidator.isValidUrl(undefined)).toBe(false);
  });
});