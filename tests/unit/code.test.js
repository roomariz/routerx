// tests/unit/code.test.js
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import { Command } from 'commander';

// Mock dependencies BEFORE importing the module under test
jest.mock('chalk', () => ({
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str),
  red: jest.fn((str) => str)
}));

jest.mock('../../src/infrastructure/config/index.js', () => {
  const mockConfig = {
    defaultModel: 'test-model',
    defaultBaseUrl: 'https://test-api.com',
    defaultSavePath: './outputs'
  };
  
  const MockConfigManager = jest.fn(() => ({
    loadConfig: jest.fn(() => mockConfig),
    getDefaultConfig: jest.fn(() => mockConfig),
    mergeConfig: jest.fn((defaults, loaded) => ({ ...defaults, ...loaded }))
  }));

  return {
    default: MockConfigManager,
    ConfigManager: MockConfigManager
  };
});

// Create a mock instance for the API client
const mockMakeGeneralChat = jest.fn();
const mockFetchModels = jest.fn();

// Mock the API client constructor
const MockApiClientConstructor = jest.fn(() => ({
  makeGeneralChat: mockMakeGeneralChat,
  fetchModels: mockFetchModels
}));

jest.mock('../../src/infrastructure/api/index.js', () => ({
  default: MockApiClientConstructor,
  ApiClient: MockApiClientConstructor
}));

jest.mock('../../src/shared/constants/index.js', () => ({
  ERROR_MESSAGES: {
    MISSING_API_KEY: '❌ Missing API key',
    REQUEST_ERROR: '❌ Error processing request',
    MODEL_FETCH_ERROR: '❌ Failed to fetch model list'
  },
  LOG_MESSAGES: {
    CODE_MODE: '📝 Mode: '
  }
}));

jest.mock('../../src/shared/utils/auth.js', () => ({
  validateApiKey: jest.fn(),
  exitWithError: jest.fn()
}));

jest.mock('../../src/shared/utils/error.js', () => ({
  handleError: jest.fn(),
  handleAPIError: jest.fn(error => error),
  exitWithError: jest.fn()
}));

jest.mock('../../src/shared/utils/file.js', () => ({
  fileExists: jest.fn(),
  readFileContent: jest.fn(),
  writeFileContent: jest.fn(),
  ensureDirectory: jest.fn(),
  resolvePath: jest.fn(p => p)
}));

jest.mock('../../src/shared/utils/stream.js', () => ({
  handleStream: jest.fn(() => Promise.resolve())
}));

// Import after mocking
const { registerCodeCommand } = require('../../src/commands/code/index.js');

describe('Code Command', () => {
  let mockProgram;
  const { validateApiKey } = require('../../src/shared/utils/auth.js');
  const { exitWithError } = require('../../src/shared/utils/error.js');
  const { fileExists, readFileContent, writeFileContent, ensureDirectory } = require('../../src/shared/utils/file.js');

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

  describe('registerCodeCommand', () => {
    test('registers the code command with correct configuration', () => {
      registerCodeCommand(mockProgram);

      const command = mockProgram.commands.find(cmd => cmd.name() === 'code');

      expect(command).toBeDefined();
      expect(command.name()).toBe('code');
      expect(command.description()).toBe('AI code assistant (generate, explain, fix, review, diff)');

      // Check arguments
      const args = command._args;
      expect(args.length).toBe(2);
      expect(args[0].arg).toBe('[mode]');
      expect(args[1].arg).toBe('[target...]');

      // Check options
      const options = command.options;
      expect(options.some(opt => opt.flags.includes('--model'))).toBe(true);
      expect(options.some(opt => opt.flags.includes('--save'))).toBe(true);
      expect(options.some(opt => opt.flags.includes('--context'))).toBe(true);
      expect(options.some(opt => opt.flags.includes('--free'))).toBe(true);
      expect(options.some(opt => opt.flags.includes('--prefer'))).toBe(true);
    });
  });

  describe('codeAction', () => {
    let codeAction;

    beforeEach(() => {
      // Register the command to get the action function
      registerCodeCommand(mockProgram);
      const codeCommand = mockProgram.commands.find(cmd => cmd.name() === 'code');
      codeAction = codeCommand._actionHandler._fn;
    });

    test('exits with error when API key is not valid', async () => {
      validateApiKey.mockReturnValue(null);

      await codeAction('generate', [], {});

      expect(exitWithError).toHaveBeenCalledWith(expect.any(String));
    });

    test('defaults to generate mode when no mode is provided', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Generated code' } }]
        }
      };
      mockMakeGeneralChat.mockResolvedValue(mockResponse);

      await codeAction(null, ['console.log("hello world")'], {});

      // Check that it was called with the expected parameters for generate mode
      expect(mockMakeGeneralChat).toHaveBeenCalledWith(
        mockApiKey,
        'test-model',  // default from config
        'console.log("hello world")',  // target joined as prompt
        'https://test-api.com'  // from config
      );
    });

    test('handles explain mode with file targets', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      // Mock file existence and content
      fileExists.mockReturnValue(true);
      readFileContent.mockReturnValue('function hello() { console.log("world"); }');

      const mockResponse = {
        data: {
          choices: [{ message: { content: 'This function logs hello world' } }]
        }
      };
      mockMakeGeneralChat.mockResolvedValue(mockResponse);

      await codeAction('explain', ['test.js'], {});

      // Check that it was called with the expected explanation prompt
      expect(mockMakeGeneralChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Explain what this code does'),
        expect.any(String)
      );
    });

    test('exits with error when explain mode files do not exist', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      // Mock file as not existing
      fileExists.mockReturnValue(false);

      await codeAction('explain', ['nonexistent.js'], {});

      expect(exitWithError).toHaveBeenCalledWith(expect.any(String));
    });

    test('handles fix mode with file targets', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      // Mock file existence and content
      fileExists.mockReturnValue(true);
      readFileContent.mockReturnValue('function test() { synta error }');

      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Fixed code' } }]
        }
      };
      mockMakeGeneralChat.mockResolvedValue(mockResponse);

      await codeAction('fix', ['buggy.js'], {});

      // Check that it was called with the expected fix prompt
      expect(mockMakeGeneralChat).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Fix and improve the following code'),
        expect.any(String)
      );
    });

    test('saves output to file when save option is provided', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Generated code result' } }]
        }
      };
      mockMakeGeneralChat.mockResolvedValue(mockResponse);

      await codeAction('generate', ['test code'], { save: 'output.txt' });

      // Verify that file operations were called
      expect(ensureDirectory).toHaveBeenCalled();
      expect(writeFileContent).toHaveBeenCalledWith(
        expect.stringContaining('output.txt'),
        'Generated code result'
      );
    });

    test('handles API error with fallback models when payment required (402)', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      // Mock API error response with 402 status
      const apiError = {
        response: { status: 402, data: { error: { message: 'Payment required' } } }
      };
      mockMakeGeneralChat.mockRejectedValueOnce(apiError);

      // Mock model fetching and fallback
      const mockModelsResponse = {
        data: {
          data: [
            { id: 'free-model:free' },
            { id: 'another-free-model-free' }
          ]
        }
      };
      mockFetchModels.mockResolvedValueOnce(mockModelsResponse);
      mockMakeGeneralChat.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'Fallback response' } }]
        }
      });

      await codeAction('generate', ['test prompt'], {});

      // Check that fallback was attempted
      expect(mockFetchModels).toHaveBeenCalled();
      expect(mockMakeGeneralChat).toHaveBeenCalledTimes(2);
    });

    test('handles rate limiting error (429) with alternate fallback', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      // Mock initial API error response with 402 status
      const paymentError = {
        response: { status: 402, data: { error: { message: 'Payment required' } } }
      };
      const rateLimitError = {
        response: { status: 429, data: { error: { message: 'Rate limited' } } }
      };

      mockMakeGeneralChat.mockRejectedValueOnce(paymentError);
      mockFetchModels.mockResolvedValueOnce({
        data: { data: [{ id: 'free-model:free' }] }
      });
      mockMakeGeneralChat.mockRejectedValueOnce(rateLimitError);

      // Mock second model fetch for alternate fallback
      mockFetchModels.mockResolvedValueOnce({
        data: { data: [{ id: 'alternate-free-model:free' }] }
      });
      mockMakeGeneralChat.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'Alternate fallback response' } }]
        }
      });

      await codeAction('generate', ['test prompt'], {});

      // Check that alternate fallback was attempted
      expect(mockMakeGeneralChat).toHaveBeenCalledTimes(3);
    });
  });
});