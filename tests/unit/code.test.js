// tests/unit/code.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import { Command } from 'commander';

// Mock the modules that code.js depends on
jest.mock('../../src/api/api.js', () => {
  return jest.fn().mockImplementation(() => ({
    makeGeneralChat: jest.fn(),
    fetchModels: jest.fn()
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
  validateApiKey: jest.fn(),
  exitWithError: jest.fn()
}));

jest.mock('../../src/utils/errorHandler.js', () => ({
  handleError: jest.fn(),
  handleAPIError: jest.fn(error => error),
  exitWithError: jest.fn()
}));

jest.mock('../../src/utils/fileUtils.js', () => ({
  fileExists: jest.fn(),
  readFileContent: jest.fn(),
  writeFileContent: jest.fn(),
  ensureDirectory: jest.fn(),
  resolvePath: jest.fn(p => p)
}));

// Import after mocking
const { registerCodeCommand } = require('../../src/commands/code.js');

describe('Code Command', () => {
  let mockProgram;
  const { validateApiKey } = require('../../src/utils/auth.js');
  const { exitWithError } = require('../../src/utils/errorHandler.js');
  const { fileExists, readFileContent, writeFileContent, ensureDirectory } = require('../../src/utils/fileUtils.js');
  
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
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      apiClientInstance.makeGeneralChat.mockResolvedValue(mockResponse);
      
      await codeAction(null, ['console.log("hello world")'], {});
      
      // Check that it was called with the expected parameters for generate mode
      expect(apiClientInstance.makeGeneralChat).toHaveBeenCalledWith(
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
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      apiClientInstance.makeGeneralChat.mockResolvedValue(mockResponse);
      
      await codeAction('explain', ['test.js'], {});
      
      // Check that it was called with the expected explanation prompt
      expect(apiClientInstance.makeGeneralChat).toHaveBeenCalledWith(
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
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      apiClientInstance.makeGeneralChat.mockResolvedValue(mockResponse);
      
      await codeAction('fix', ['buggy.js'], {});
      
      // Check that it was called with the expected fix prompt
      expect(apiClientInstance.makeGeneralChat).toHaveBeenCalledWith(
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
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      apiClientInstance.makeGeneralChat.mockResolvedValue(mockResponse);
      
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
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      apiClientInstance.makeGeneralChat.mockRejectedValueOnce(apiError);
      
      // Mock model fetching and fallback
      const mockModelsResponse = {
        data: {
          data: [
            { id: 'free-model:free' },
            { id: 'another-free-model-free' }
          ]
        }
      };
      apiClientInstance.fetchModels.mockResolvedValueOnce(mockModelsResponse);
      apiClientInstance.makeGeneralChat.mockResolvedValueOnce({
        data: { 
          choices: [{ message: { content: 'Fallback response' } }] 
        } 
      });
      
      await codeAction('generate', ['test prompt'], {});
      
      // Check that fallback was attempted
      expect(apiClientInstance.fetchModels).toHaveBeenCalled();
      expect(apiClientInstance.makeGeneralChat).toHaveBeenCalledTimes(2);
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
      
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      apiClientInstance.makeGeneralChat.mockRejectedValueOnce(paymentError);
      apiClientInstance.fetchModels.mockResolvedValueOnce({
        data: { data: [{ id: 'free-model:free' }] }
      });
      apiClientInstance.makeGeneralChat.mockRejectedValueOnce(rateLimitError);
      
      // Mock second model fetch for alternate fallback
      apiClientInstance.fetchModels.mockResolvedValueOnce({
        data: { data: [{ id: 'alternate-free-model:free' }] }
      });
      apiClientInstance.makeGeneralChat.mockResolvedValueOnce({
        data: { 
          choices: [{ message: { content: 'Alternate fallback response' } }] 
        } 
      });
      
      await codeAction('generate', ['test prompt'], {});
      
      // Check that alternate fallback was attempted
      expect(apiClientInstance.makeGeneralChat).toHaveBeenCalledTimes(3);
    });
  });
});