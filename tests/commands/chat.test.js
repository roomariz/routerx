// tests/commands/chat.test.js
// Unit tests for chat command functionality

import { jest } from '@jest/globals';

// Mock the dependencies BEFORE importing the module that uses them
jest.mock('chalk', () => ({
  dim: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str)
}));

jest.mock('../../src/infrastructure/api/index.js', () => ({
  ApiClient: jest.fn(() => ({
    makeChatCompletion: jest.fn(() => Promise.resolve({ data: { on: jest.fn() } }))
  }))
}));

jest.mock('../../src/infrastructure/config/index.js', () => ({
  ConfigManager: jest.fn(() => ({
    loadConfig: jest.fn(() => ({
      defaultModel: 'test-model',
      defaultBaseUrl: 'https://test.example.com'
    }))
  }))
}));

// Import after mocking
import { handleChatCommand } from '../../src/commands/chat/handler.js';

describe('Chat Command Handler', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  test('should handle chat command with basic prompt', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await handleChatCommand('test prompt', {});

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});