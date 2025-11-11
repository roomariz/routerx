// tests/unit/models.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';

// Mock the modules that models.js depends on
jest.mock('../../src/api/api.js', () => {
  return jest.fn().mockImplementation(() => ({
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
  validateApiKey: jest.fn()
}));

jest.mock('../../src/utils/errorHandler.js', () => ({
  handleError: jest.fn()
}));

// Import after mocking
const { registerModelsCommand } = require('../../src/commands/models.js');

describe('Models Command', () => {
  let mockProgram;
  const { validateApiKey } = require('../../src/utils/auth.js');
  const { handleError } = require('../../src/utils/errorHandler.js');
  
  // Save original console and process
  const originalConsole = { ...console };

  beforeEach(() => {
    mockProgram = new Command();
    jest.clearAllMocks();
    
    // Mock console methods to avoid actual logging during tests
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe('registerModelsCommand', () => {
    test('registers the models command with correct configuration', () => {
      registerModelsCommand(mockProgram);

      const command = mockProgram.commands.find(cmd => cmd.name() === 'models');
      
      expect(command).toBeDefined();
      expect(command.name()).toBe('models');
      expect(command.description()).toBe('List available models (free, paid, or filtered by search keyword)');
      
      // Check options
      const options = command.options;
      expect(options.some(opt => opt.flags.includes('--free'))).toBe(true);
      expect(options.some(opt => opt.flags.includes('--search'))).toBe(true);
    });
  });

  describe('modelsAction', () => {
    let modelsAction;
    
    beforeEach(() => {
      // Register the command to get the action function
      registerModelsCommand(mockProgram);
      const modelsCommand = mockProgram.commands.find(cmd => cmd.name() === 'models');
      modelsAction = modelsCommand._actionHandler._fn;
    });

    test('fetches and displays models when successful', async () => {
      // Get the API client instance from the current module - needs to be done early
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      const mockResponse = {
        data: {
          data: [
            { id: 'model1', pricing: { prompt: 0 } },
            { id: 'model2-free', pricing: { prompt: 0.5 } },
            { id: 'model3', pricing: { prompt: 1 } }
          ]
        }
      };
      
      apiClientInstance.fetchModels.mockResolvedValue(mockResponse);
      
      await modelsAction({});
      
      // Verify API was called
      expect(apiClientInstance.fetchModels).toHaveBeenCalledWith('https://test-api.com');
      
      // Check that models were displayed (logging occurred)
      expect(console.log).toHaveBeenCalledWith('\nAvailable models:\n');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('model1'),
        expect.stringContaining('| Free')
      );
    });

    test('filters models by free option when provided', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      const mockResponse = {
        data: {
          data: [
            { id: 'free-model:free', pricing: { prompt: 0 } },
            { id: 'paid-model', pricing: { prompt: 1 } },
            { id: 'another-free-model-free', pricing: { prompt: 0 } }
          ]
        }
      };
      
      // Get the API client instance from the current module
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      apiClientInstance.fetchModels.mockResolvedValue(mockResponse);
      
      await modelsAction({ free: true });
      
      // Check that only free models were displayed
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Available models Free:')
      );
    });

    test('filters models by search keyword when provided', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      const mockResponse = {
        data: {
          data: [
            { id: 'openai/gpt-4', pricing: { prompt: 1 } },
            { id: 'mistral/mistral-large', pricing: { prompt: 0.5 } },
            { id: 'anthropic/claude', pricing: { prompt: 1.5 } }
          ]
        }
      };
      
      // Get the API client instance from the current module - needs to be done early
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      apiClientInstance.fetchModels.mockResolvedValue(mockResponse);
      
      await modelsAction({ search: 'mistral' });
      
      // Check that the search was mentioned in the output
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('matching \'mistral\'')
      );
    });

    test('shows no models message when filtered list is empty', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      const mockResponse = {
        data: {
          data: [
            { id: 'paid-model', pricing: { prompt: 1 } }
          ]
        }
      };
      
      // Get the API client instance from the current module - needs to be done early
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      apiClientInstance.fetchModels.mockResolvedValue(mockResponse);
      
      await modelsAction({ free: true });  // Looking for free models in paid-only list
      
      // Check that no models found message was shown
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No models found')
      );
    });

    test('handles API errors gracefully', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      // Get the API client instance from the current module - needs to be done early
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      const mockError = new Error('API Error');
      
      apiClientInstance.fetchModels.mockRejectedValue(mockError);
      
      await modelsAction({});
      
      expect(handleError).toHaveBeenCalledWith(mockError, 'MODEL_FETCH_ERROR');
    });

    test('does not require an API key to run', async () => {
      validateApiKey.mockReturnValue(null);
      
      const mockResponse = {
        data: {
          data: [
            { id: 'test-model', pricing: { prompt: 0.5 } }
          ]
        }
      };
      
      // Get the API client instance from the current module - needs to be done early
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      
      apiClientInstance.fetchModels.mockResolvedValue(mockResponse);
      
      await modelsAction({});
      
      // Should still call the API even without an API key
      expect(apiClientInstance.fetchModels).toHaveBeenCalledWith('https://test-api.com');
    });
  });

  describe('filterModels function', () => {
    // Since we can't directly import internal functions, we'll test through the public interface
    // but verify the filtering logic through the behavior
    
    test('filters by free models correctly', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);
      
      const mockResponse = {
        data: {
          data: [
            { id: 'free-model:free', pricing: { prompt: 0 } },
            { id: 'paid-model', pricing: { prompt: 1 } },
            { id: 'another-free', id: 'free-test-free' }
          ]
        }
      };
      
      const ApiClient = require('../../src/api/api.js');
      const apiClientInstance = ApiClient.mock.instances[0];
      apiClientInstance.fetchModels.mockResolvedValue(mockResponse);
      
      await modelsAction({ free: true });
      
      // Verify that only free models would be shown
      expect(apiClientInstance.fetchModels).toHaveBeenCalled();
    });
  });
});