// tests/commands/chat.test.js
// Unit tests for chat command functionality

import { handleChatCommand } from '../../src/commands/chat/handler.js';
import { jest } from '@jest/globals';

// Mock the dependencies
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

jest.mock('chalk', () => ({
  dim: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str)
}));

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