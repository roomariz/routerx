// tests/unit/constants.test.js
import { describe, test, expect } from '@jest/globals';
import { CLI_INFO, ERROR_MESSAGES, LOG_MESSAGES, DEFAULT_VALUES, FREE_MODEL_KEYWORDS, CODE_MODEL_KEYWORDS } from '../../src/shared/constants/index.js';

describe('Constants', () => {
  describe('CLI_INFO', () => {
    test('should have expected properties', () => {
      expect(CLI_INFO).toHaveProperty('NAME');
      expect(CLI_INFO).toHaveProperty('DESCRIPTION');
      expect(CLI_INFO).toHaveProperty('VERSION');
    });

    test('should have correct CLI info values', () => {
      expect(CLI_INFO.NAME).toBe('RouterX');
      expect(CLI_INFO.DESCRIPTION).toBe('A lightweight CLI for interacting with OpenRouter models');
      expect(CLI_INFO.VERSION).toBe('1.0.0');
    });
  });

  describe('ERROR_MESSAGES', () => {
    test('should have expected error message properties', () => {
      expect(ERROR_MESSAGES).toHaveProperty('MISSING_API_KEY');
      expect(ERROR_MESSAGES).toHaveProperty('MODEL_FETCH_ERROR');
      expect(ERROR_MESSAGES).toHaveProperty('REQUEST_ERROR');
      expect(ERROR_MESSAGES).toHaveProperty('NETWORK_ERROR');
      expect(ERROR_MESSAGES).toHaveProperty('FILE_NOT_FOUND');
    });

    test('should have correct error message values', () => {
      expect(ERROR_MESSAGES.MISSING_API_KEY).toContain('❌ Missing API key');
      expect(ERROR_MESSAGES.MODEL_FETCH_ERROR).toContain('❌ Failed to fetch model list');
      expect(ERROR_MESSAGES.REQUEST_ERROR).toContain('❌ Error processing request');
      expect(ERROR_MESSAGES.NETWORK_ERROR).toContain('❌ Network Error');
      expect(ERROR_MESSAGES.FILE_NOT_FOUND).toContain('❌ File does not exist');
    });
  });

  describe('LOG_MESSAGES', () => {
    test('should have expected log message properties', () => {
      expect(LOG_MESSAGES).toHaveProperty('SENDING_TO_MODEL');
      expect(LOG_MESSAGES).toHaveProperty('API_BASE_URL');
      expect(LOG_MESSAGES).toHaveProperty('PROMPT_INFO');
      expect(LOG_MESSAGES).toHaveProperty('REPLY_STREAMING');
      expect(LOG_MESSAGES).toHaveProperty('STREAM_COMPLETE');
      expect(LOG_MESSAGES).toHaveProperty('FETCHING_MODELS');
      expect(LOG_MESSAGES).toHaveProperty('AVAILABLE_MODELS');
      expect(LOG_MESSAGES).toHaveProperty('NO_MODELS_FOUND');
      expect(LOG_MESSAGES).toHaveProperty('USING_MODEL');
      expect(LOG_MESSAGES).toHaveProperty('CODE_MODE');
      expect(LOG_MESSAGES).toHaveProperty('REPLY_HEADER');
      expect(LOG_MESSAGES).toHaveProperty('SAVED_TO_FILE');
    });

    test('should have correct log message values', () => {
      expect(LOG_MESSAGES.SENDING_TO_MODEL).toBe('🧠 Sending to model: ');
      expect(LOG_MESSAGES.API_BASE_URL).toBe('🔗 API Base URL: ');
      expect(LOG_MESSAGES.PROMPT_INFO).toBe('📝 Prompt: ');
      expect(LOG_MESSAGES.REPLY_STREAMING).toBe('💬 Reply (streaming):\n');
      expect(LOG_MESSAGES.STREAM_COMPLETE).toBe('✅ Stream complete.');
      expect(LOG_MESSAGES.FETCHING_MODELS).toBe('📡 Fetching model list...');
      expect(LOG_MESSAGES.AVAILABLE_MODELS).toBe('🧠 Available Models');
      expect(LOG_MESSAGES.NO_MODELS_FOUND).toBe('⚠️ No models found matching your filters.');
      expect(LOG_MESSAGES.USING_MODEL).toBe('🧠 Using model: ');
      expect(LOG_MESSAGES.CODE_MODE).toBe('📝 Mode: ');
      expect(LOG_MESSAGES.REPLY_HEADER).toBe('\n💬 Reply:\n');
      expect(LOG_MESSAGES.SAVED_TO_FILE).toBe('💾 Saved to ');
    });
  });

  describe('DEFAULT_VALUES', () => {
    test('should have expected default value properties', () => {
      expect(DEFAULT_VALUES).toHaveProperty('MODEL');
      expect(DEFAULT_VALUES).toHaveProperty('BASE_URL');
      expect(DEFAULT_VALUES).toHaveProperty('SAVE_PATH');
      expect(DEFAULT_VALUES).toHaveProperty('TIMEOUT');
      expect(DEFAULT_VALUES).toHaveProperty('MAX_RETRIES');
    });

    test('should have correct default values', () => {
      expect(DEFAULT_VALUES.MODEL).toBe('openai/gpt-4o-mini');
      expect(DEFAULT_VALUES.BASE_URL).toBe('https://openrouter.ai/api/v1');
      expect(DEFAULT_VALUES.SAVE_PATH).toBe('./outputs');
      expect(DEFAULT_VALUES.TIMEOUT).toBe(30000);
      expect(DEFAULT_VALUES.MAX_RETRIES).toBe(3);
    });
  });

  describe('FREE_MODEL_KEYWORDS', () => {
    test('should have expected free model keywords', () => {
      expect(Array.isArray(FREE_MODEL_KEYWORDS)).toBe(true);
      expect(FREE_MODEL_KEYWORDS).toContain('free');
      expect(FREE_MODEL_KEYWORDS).toContain(':free');
      expect(FREE_MODEL_KEYWORDS).toContain('-free');
      expect(FREE_MODEL_KEYWORDS).toContain('/free');
    });
  });

  describe('CODE_MODEL_KEYWORDS', () => {
    test('should have expected code model keywords', () => {
      expect(Array.isArray(CODE_MODEL_KEYWORDS)).toBe(true);
      expect(CODE_MODEL_KEYWORDS).toContain('coder');
      expect(CODE_MODEL_KEYWORDS).toContain('code');
      expect(CODE_MODEL_KEYWORDS).toContain('mistral');
      expect(CODE_MODEL_KEYWORDS).toContain('qwen');
      expect(CODE_MODEL_KEYWORDS).toContain('llama');
      expect(CODE_MODEL_KEYWORDS).toContain('gemma');
    });
  });
});