// tests/unit/chat.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import chalk from 'chalk';
import { Command } from 'commander';

// Mock the modules that chat.js depends on
jest.mock('../../src/api/api.js', () => {
  return jest.fn().mockImplementation(() => ({
    makeChatCompletion: jest.fn()
  }));
});

jest.mock('../../src/config/config.js', () => {
  return jest.fn().mockImplementation(() => ({
    loadConfig: jest.fn(() => ({
      defaultModel: 'test-model',
      defaultBaseUrl: 'https://test-api.com',
      defaultSavePath: './outputs'
    }))
  }));
});

jest.mock('../../src/utils/auth.js', () => ({
  validateApiKey: jest.fn()
}));

jest.mock('../../src/utils/streamHandler.js', () => ({
  handleStream: jest.fn()
}));

jest.mock('../../src/utils/errorHandler.js', () => ({
  handleError: jest.fn()
}));

jest.mock('../../src/utils/fileUtils.js', () => ({
  formatTimestamp: jest.fn(() => '[12:00:00]')
}));

// Import after mocking
const { registerChatCommand } = require('../../src/commands/chat.js');

describe('Chat Command', () => {
  let mockProgram;
  const { validateApiKey } = require('../../src/utils/auth.js');
  const { handleStream } = require('../../src/utils/streamHandler.js');
  const { handleError } = require('../../src/utils/errorHandler.js');
  const { formatTimestamp } = require('../../src/utils/fileUtils.js');
  
  // Save original console and process
  const originalConsole = { ...console };
  const originalExit = process.exit;

  beforeEach(() => {
    mockProgram = new Command();
    jest.clearAllMocks();
    
    // Mock console methods to avoid actual logging during tests
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();
  });

  afterEach(() => {
    // Restore original console and process methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    process.exit = originalExit;
  });

  describe('registerChatCommand', () => {
    test('registers the chat command with correct configuration', () => {
      registerChatCommand(mockProgram);

      const command = mockProgram.commands.find(cmd => cmd.name() === 'chat');
      
      expect(command).toBeDefined();
      expect(command.name()).toBe('chat');
      expect(command.description()).toBe(''); // No explicit description
      
      // Check arguments
      const args = command._args;
      expect(args.length).toBe(1);
      expect(args[0].arg).toBe('<prompt>');
      expect(args[0].description).toBe('Prompt to send to the model');
      
      // Check options
      const options = command.options;
      expect(options.some(opt => opt.flags.includes('--model'))).toBe(true);
      expect(options.some(opt => opt.flags.includes('--base-url'))).toBe(true);
      expect(options.some(opt => opt.flags.includes('--save'))).toBe(true);
    });
  });

  describe('chatAction', () => {
    let chatAction;
    
    beforeEach(() => {
      // Register the command to get the action function
      registerChatCommand(mockProgram);
      const chatCommand = mockProgram.commands.find(cmd => cmd.name() === 'chat');
      chatAction = chatCommand._actionHandler._fn;
    });

    test('exits with error when API key is not valid', async () => {
      validateApiKey.mockReturnValue(null);
      
      // Get the chatAction function inside the test
      registerChatCommand(mockProgram);
      const chatCmd = mockProgram.commands.find(cmd => cmd.name() === 'chat');
      const chatAction = chatCmd._actionHandler._fn;
      
      // Mock exitWithError to prevent actual exit
      const { exitWithError } = require('../../src/utils/errorHandler.js');
      
      await chatAction('test prompt', {});
      
      expect(exitWithError).toHaveBeenCalledWith(expect.any(String));
    });

    test('uses default config values when options are not provided', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      // Get the API client instance from the current module
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      const mockResponse = { data: { on: jest.fn() } };
      apiClientInstance.makeChatCompletion.mockResolvedValue(mockResponse);
      
      await chatAction('test prompt', {});
      
      expect(apiClientInstance.makeChatCompletion).toHaveBeenCalledWith(
        mockApiKey,
        'test-model',  // default from config
        'test prompt',
        'https://test-api.com'  // default from config
      );
    });

    test('uses provided options instead of defaults', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      // Get the API client instance from the current module
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      const mockResponse = { data: { on: jest.fn() } };
      apiClientInstance.makeChatCompletion.mockResolvedValue(mockResponse);
      
      const options = {
        model: 'custom-model',
        baseUrl: 'https://custom-api.com',
        save: './output.txt'
      };
      
      await chatAction('test prompt', options);
      
      expect(apiClientInstance.makeChatCompletion).toHaveBeenCalledWith(
        mockApiKey,
        'custom-model',  // provided option
        'test prompt',
        'https://custom-api.com'  // provided option
      );
    });

    test('handles API errors gracefully', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      // Get the API client instance from the current module
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      const mockError = new Error('API Error');
      apiClientInstance.makeChatCompletion.mockRejectedValue(mockError);
      
      await chatAction('test prompt', {});
      
      expect(handleError).toHaveBeenCalledWith(mockError, 'REQUEST_ERROR');
    });

    test('calls handleStream with correct options', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      // Get the API client instance from the current module
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      const mockStream = { on: jest.fn() };
      const mockResponse = { data: mockStream };
      apiClientInstance.makeChatCompletion.mockResolvedValue(mockResponse);
      
      const options = { save: './output.txt' };
      await chatAction('test prompt', options);
      
      expect(handleStream).toHaveBeenCalledWith(mockResponse, {
        save: './output.txt',
        prompt: 'test prompt'
      });
    });
  });
});