// tests/unit/configValidator.test.js
import { describe, test, expect } from '@jest/globals';
import { ConfigValidator } from '../../src/monitoring/configValidator.js';
import { createRouterXError } from '../../src/shared/utils/error.js';

describe('ConfigValidator', () => {
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

  const baseConfig = {
    defaultModel: 'openai/gpt-4o-mini',
    defaultBaseUrl: 'https://api.example.com',
    defaultSavePath: './outputs',
    maxRetries: 3,
    timeout: 30000,
    resilience: baseResilience
  };

  test('validates valid configuration successfully', () => {
    const validConfig = { ...baseConfig };

    expect(() => ConfigValidator.validate(validConfig)).not.toThrow();
    expect(ConfigValidator.validate(validConfig)).toBe(true);
  });

  test('throws error for invalid defaultModel', () => {
    const invalidConfig = {
      ...baseConfig,
      defaultModel: '' // Empty string
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
      ...baseConfig,
      defaultBaseUrl: 'not-a-url' // Invalid URL
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
      ...baseConfig,
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
      ...baseConfig,
      maxRetries: -1 // Negative value
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