// tests/unit/code.test.js
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'path';
import { Command } from 'commander';

// Mock dependencies BEFORE importing the module under test
jest.mock('chalk', () => ({
  default: {
    yellow: jest.fn((str) => str),
    green: jest.fn((str) => str),
    red: jest.fn((str) => str),
    cyan: jest.fn((str) => str),
    blue: jest.fn((str) => str),
    dim: jest.fn((str) => str)
  },
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str),
  red: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  blue: jest.fn((str) => str),
  dim: jest.fn((str) => str)
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

// Create shared mock functions that will be used by all API client instances
let mockMakeGeneralChat, mockFetchModels;

// Mock the API client constructor to return different mock instances for each creation
// This allows different API client instances to have different behaviors during fallback
const MockApiClientConstructor = jest.fn();

beforeAll(() => {
  // Initialize the mock functions
  mockMakeGeneralChat = jest.fn();
  mockFetchModels = jest.fn();
});

// Track instances created during test execution for sequence-dependent tests
let createdInstances = [];
let useSeparateInstances = false; // Flag to control behavior per test
let preconfiguredInstances = null; // Allow tests to pre-configure instances
let instanceNumber = 0; // Counter for tracking which instance is being created in the current test

beforeEach(() => {
  // Clear the tracking array and reset flags
  createdInstances = [];
  useSeparateInstances = false;
  preconfiguredInstances = null;
  instanceNumber = 0; // Reset instance counter for each test

  // Reset and update the mock constructor to behave differently based on the flags
  MockApiClientConstructor.mockImplementation(() => {
    instanceNumber++;
    if (useSeparateInstances) {
      if (preconfiguredInstances && preconfiguredInstances[instanceNumber - 1]) {
        // Use pre-configured instance if available
        const instance = preconfiguredInstances[instanceNumber - 1];
        createdInstances.push(instance);
        return instance;
      } else {
        // Create new instance with separate mocks
        const instance = {
          makeGeneralChat: jest.fn(),
          fetchModels: jest.fn()
        };
        createdInstances.push(instance);
        return instance;
      }
    } else {
      // For regular tests - use shared mocks
      return {
        makeGeneralChat: mockMakeGeneralChat,
        fetchModels: mockFetchModels
      };
    }
  });

  // Clear the main shared mocks
  if (mockMakeGeneralChat) mockMakeGeneralChat.mockClear();
  if (mockFetchModels) mockFetchModels.mockClear();
});

jest.mock('../../src/infrastructure/api/index.js', () => ({
  default: MockApiClientConstructor,
  ApiClient: MockApiClientConstructor
}));

jest.mock('../../src/shared/constants/index.js', () => ({
  ERROR_MESSAGES: {
    MISSING_API_KEY: '❌ Missing API key',
    REQUEST_ERROR: '❌ Error processing request',
    MODEL_FETCH_ERROR: '❌ Failed to fetch model list',
    FILE_NOT_FOUND: '❌ File not found'
  },
  LOG_MESSAGES: {
    CODE_MODE: '📝 Mode: ',
    USING_MODEL: 'Using model: ',
    REPLY_HEADER: '💬 Reply:\n'
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
const { registerCodeCommand, handleCodeCommand } = require('../../src/commands/code/index.js');

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
      // Reconstruct the argument format to match expected format in Commander.js v14
      const firstArgFormat = args[0].required ? '<' + args[0]._name + '>' : '[' + args[0]._name + ']';
      const secondArgFormat = args[1].variadic ? '[' + args[1]._name + '...]' : (args[1].required ? '<' + args[1]._name + '>' : '[' + args[1]._name + ']');
      expect(firstArgFormat).toBe('[mode]');
      expect(secondArgFormat).toBe('[target...]');

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
      // Use the exported handler function directly
      codeAction = handleCodeCommand;
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

      // Enable separate instances mode and pre-configure the instances with expected behavior
      useSeparateInstances = true;
      instanceNumber = 0; // Reset instance counter to ensure proper sequence

      const firstInstance = {
        makeGeneralChat: jest.fn().mockRejectedValue({
          response: { status: 402, data: { error: { message: 'Payment required' } } }
        }),
        fetchModels: jest.fn()
      };

      const secondInstance = {
        makeGeneralChat: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { content: 'Fallback response' } }]
          }
        }),
        fetchModels: jest.fn().mockResolvedValue({
          data: {
            data: [
              { id: 'free-model:free' },
              { id: 'another-free-model-free' }
            ]
          }
        })
      };

      preconfiguredInstances = [firstInstance, secondInstance];

      await codeAction('generate', ['test prompt'], {});

      // Check that fallback was attempted - first instance fails, second succeeds
      expect(firstInstance.makeGeneralChat).toHaveBeenCalledTimes(1);
      expect(secondInstance.makeGeneralChat).toHaveBeenCalledTimes(1);
      expect(secondInstance.fetchModels).toHaveBeenCalled();
    });

    test('handles rate limiting error (429) with alternate fallback', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      // Enable separate instances mode and pre-configure the instances with expected behavior
      useSeparateInstances = true;
      instanceNumber = 0; // Reset instance counter to ensure proper sequence

      const firstInstance = {
        makeGeneralChat: jest.fn().mockRejectedValue({
          response: { status: 402, data: { error: { message: 'Payment required' } } }
        }),
        fetchModels: jest.fn() // Won't be called on first instance
      };

      const secondInstance = {
        makeGeneralChat: jest.fn().mockRejectedValue({
          response: { status: 429, data: { error: { message: 'Rate limited' } } }
        }),
        fetchModels: jest.fn().mockResolvedValue({
          data: {
            data: [{ id: 'free-model:free' }]
          }
        })
      };

      const thirdInstance = {
        makeGeneralChat: jest.fn().mockResolvedValue({
          data: {
            choices: [{ message: { content: 'Alternate fallback response' } }]
          }
        }),
        fetchModels: jest.fn().mockResolvedValue({
          data: {
            data: [{ id: 'alternate-free-model:free' }]
          }
        })
      };

      preconfiguredInstances = [firstInstance, secondInstance, thirdInstance];

      await codeAction('generate', ['test prompt'], {});

      // Check that all 3 instances were created and used (first fails, second fails with 429, third succeeds)
      expect(firstInstance.makeGeneralChat).toHaveBeenCalledTimes(1);
      expect(secondInstance.makeGeneralChat).toHaveBeenCalledTimes(1);
      expect(thirdInstance.makeGeneralChat).toHaveBeenCalledTimes(1);
      expect(secondInstance.fetchModels).toHaveBeenCalled(); // First fallback fetches models
      expect(thirdInstance.fetchModels).toHaveBeenCalled(); // Second fallback fetches models
    });
  });
});