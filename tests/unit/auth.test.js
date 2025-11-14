// tests/unit/auth.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { validateApiKey } from '../../src/shared/utils/auth.js';

describe('Auth Utilities', () => {
  // Save original process.env
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = originalEnv;
  });

  describe('validateApiKey', () => {
    test('returns OPENAI_API_KEY if available', () => {
      process.env.OPENAI_API_KEY = 'sk-test123';
      process.env.OPENROUTER_API_KEY = '';
      process.env.GEMINI_API_KEY = '';
      
      const result = validateApiKey();
      
      expect(result).toBe('sk-test123');
    });

    test('returns OPENROUTER_API_KEY if OPENAI_API_KEY is not available', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENROUTER_API_KEY = 'or-test456';
      delete process.env.GEMINI_API_KEY;
      
      const result = validateApiKey();
      
      expect(result).toBe('or-test456');
    });

    test('returns OPENROUTER_API_KEY if OPENAI_API_KEY is empty', () => {
      process.env.OPENAI_API_KEY = '';
      process.env.OPENROUTER_API_KEY = 'or-test456';
      process.env.GEMINI_API_KEY = 'gm-test789';
      
      const result = validateApiKey();
      
      expect(result).toBe('or-test456');
    });

    test('returns GEMINI_API_KEY if other keys are not available', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      process.env.GEMINI_API_KEY = 'gm-test789';
      
      const result = validateApiKey();
      
      expect(result).toBe('gm-test789');
    });

    test('returns null if no API keys are available', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      const result = validateApiKey();
      
      expect(result).toBeNull();
    });

    test('returns null if all API keys are empty', () => {
      process.env.OPENAI_API_KEY = '';
      process.env.OPENROUTER_API_KEY = '';
      process.env.GEMINI_API_KEY = '';
      
      const result = validateApiKey();
      
      expect(result).toBeNull();
    });

    test('returns OPENAI_API_KEY when multiple keys are available', () => {
      process.env.OPENAI_API_KEY = 'sk-test123';
      process.env.OPENROUTER_API_KEY = 'or-test456';
      process.env.GEMINI_API_KEY = 'gm-test789';
      
      const result = validateApiKey();
      
      expect(result).toBe('sk-test123');
    });

    test('returns OPENROUTER_API_KEY over GEMINI_API_KEY when OPENAI_API_KEY is missing', () => {
      delete process.env.OPENAI_API_KEY;
      process.env.OPENROUTER_API_KEY = 'or-test456';
      process.env.GEMINI_API_KEY = 'gm-test789';

      const result = validateApiKey();

      expect(result).toBe('or-test456');
    });
  });
});
