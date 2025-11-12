// tests/unit/models.test.js 
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';
import { jest } from '@jest/globals';

// Mock dependencies BEFORE importing the module under test
jest.mock('chalk', () => ({
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str)
}));

// Create a mock instance for the API client
const mockFetchModels = jest.fn();

// Mock the API client constructor
const MockApiClientConstructor = jest.fn(() => ({
  fetchModels: mockFetchModels
}));

jest.mock('../../src/infrastructure/config/runtimeConfig.js', () => {
  const mockConfig = {
    defaultModel: 'test-model',
    defaultBaseUrl: 'https://test-api.com',
    defaultSavePath: './outputs',
    resilience: {
      timeoutMs: 30000,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      jitterMs: 250,
      breakerThreshold: 5,
      breakerCooldownMs: 60000
    }
  };

  return {
    getRuntimeConfig: jest.fn(() => mockConfig),
    loadRuntimeConfig: jest.fn(() => mockConfig)
  };
});

jest.mock('../../src/infrastructure/api/index.js', () => ({
  default: MockApiClientConstructor,
  ApiClient: MockApiClientConstructor
}));

jest.mock('../../src/shared/constants/index.js', () => ({
  ERROR_MESSAGES: {
    MODEL_FETCH_ERROR: '❌ Failed to fetch model list',
    MISSING_API_KEY: '❌ Missing API key',
    NO_MODELS_FOUND: 'No models found'
  },
  LOG_MESSAGES: {
    FETCHING_MODELS: 'Fetching models...',
    AVAILABLE_MODELS: 'Available models'
  }
}));

jest.mock('../../src/shared/utils/auth.js', () => ({
  validateApiKey: jest.fn()
}));

jest.mock('../../src/shared/utils/error.js', () => ({
  handleError: jest.fn()
}));

// Import after mocking
const { registerModelsCommand, handleModelsCommand, filterModels } = require('../../src/commands/models/index.js');

describe('Models Command', () => {
  let mockProgram;
  const { validateApiKey } = require('../../src/shared/utils/auth.js');
  const { handleError } = require('../../src/shared/utils/error.js');

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
      // Use the exported handler function directly
      modelsAction = handleModelsCommand;
    });

    test('fetches and displays models when successful', async () => {
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

      mockFetchModels.mockResolvedValue(mockResponse);

      await modelsAction({});

      // Verify API was called
      expect(mockFetchModels).toHaveBeenCalledWith('https://test-api.com');

      // Check that models were displayed (logging occurred)
      expect(console.log).toHaveBeenCalledWith('\nAvailable models:\n');
      const loggedModelEntry = console.log.mock.calls.find(call => 
        call[0] && call[0].includes('model1') && call[0].includes('| Free')
      );
      expect(loggedModelEntry).toBeDefined();
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

      mockFetchModels.mockResolvedValue(mockResponse);

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

      mockFetchModels.mockResolvedValue(mockResponse);

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

      mockFetchModels.mockResolvedValue(mockResponse);

      await modelsAction({ free: true });  // Looking for free models in paid-only list

      // Check that no models found message was shown
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('No models found')
      );
    });

    test('handles API errors gracefully', async () => {
      const mockApiKey = 'test-api-key';
      validateApiKey.mockReturnValue(mockApiKey);

      const mockError = new Error('API Error');

      mockFetchModels.mockRejectedValue(mockError);

      await modelsAction({});

      expect(handleError).toHaveBeenCalledWith(mockError, 'MODEL_FETCH_ERROR', { operation: 'handleModelsCommand', options: {} });
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

      mockFetchModels.mockResolvedValue(mockResponse);

      await modelsAction({});

      // Should still call the API even without an API key
      expect(mockFetchModels).toHaveBeenCalledWith('https://test-api.com');
    });
  });

  describe('filterModels function', () => {
    test('filters by free models correctly', async () => {
      const models = [
        { id: 'free-model:free', pricing: { prompt: 0 } },
        { id: 'paid-model', pricing: { prompt: 1 } },
        { id: 'another-free-model-free', pricing: { prompt: 0 } }
      ];

      const filtered = filterModels(models, { free: true });

      // Verify that only free models are returned
      expect(filtered.length).toBe(2);
      expect(filtered).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'free-model:free' }),
          expect.objectContaining({ id: 'another-free-model-free' })
        ])
      );
    });
  });
});
