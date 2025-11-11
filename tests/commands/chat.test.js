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
    makeChatCompletion: jest.fn(() => {
      // Create a mock stream that simulates the behavior of a real stream
      const mockStream = {
        on: jest.fn((event, handler) => {
          // Simulate receiving data and ending the stream after a short delay
          if (event === 'data') {
            // Call the data handler with some mock data
            setTimeout(() => handler('Mock stream data\n'), 10);
          } else if (event === 'end') {
            // Call the end handler after data has been processed
            setTimeout(() => handler(), 20);
          } else if (event === 'error') {
            // Don't trigger error handler for successful test
          }
          return mockStream; // Make it chainable
        })
      };
      return Promise.resolve({ data: mockStream });
    })
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