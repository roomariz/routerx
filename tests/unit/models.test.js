import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';
import { jest } from '@jest/globals';

jest.mock('chalk', () => {
  const passthrough = (value) => value;
  passthrough.bold = passthrough;
  passthrough.yellow = passthrough;
  passthrough.green = passthrough;
  passthrough.red = passthrough;
  passthrough.white = passthrough;
  passthrough.blue = passthrough;
  passthrough.cyan = passthrough;
  passthrough.gray = passthrough;
  passthrough.dim = passthrough;
  passthrough.hex = () => passthrough;
  return passthrough;
});

const mockFetchModels = jest.fn();
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
  }
}));

jest.mock('../../src/shared/utils/auth.js', () => ({
  validateApiKey: jest.fn()
}));

jest.mock('../../src/shared/utils/error.js', () => ({
  handleError: jest.fn()
}));

jest.mock('../../src/shared/utils/cache.js', () => ({
  readJsonCache: jest.fn(() => null),
  writeJsonCache: jest.fn()
}));

const { registerModelsCommand, handleModelsCommand, filterModels } = require('../../src/commands/models/index.js');
const { validateApiKey } = require('../../src/shared/utils/auth.js');
const { handleError } = require('../../src/shared/utils/error.js');
const { readJsonCache, writeJsonCache } = require('../../src/shared/utils/cache.js');

describe('Models Command', () => {
  let mockProgram;
  const originalConsole = { ...console };

  beforeEach(() => {
    mockProgram = new Command();
    jest.clearAllMocks();
    readJsonCache.mockReturnValue(null);
    writeJsonCache.mockClear();

    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  describe('registerModelsCommand', () => {
    test('registers the models command with new flags', () => {
      registerModelsCommand(mockProgram);
      const command = mockProgram.commands.find((cmd) => cmd.name() === 'models');
      expect(command).toBeDefined();
      expect(command.description()).toContain('Browse RouterX models');

      const options = command.options.map((opt) => opt.flags);
      expect(options.some((flags) => flags.includes('--free'))).toBe(true);
      expect(options.some((flags) => flags.includes('--search'))).toBe(true);
      expect(options.some((flags) => flags.includes('--vendor'))).toBe(true);
      expect(options.some((flags) => flags.includes('--limit'))).toBe(true);
      expect(options.some((flags) => flags.includes('--json'))).toBe(true);
    });
  });

  describe('handleModelsCommand', () => {
    const modelsAction = handleModelsCommand;

    test('fetches, caches, and prints models', async () => {
      validateApiKey.mockReturnValue('key');
      mockFetchModels.mockResolvedValue({
        data: {
          data: [
            { id: 'model1', pricing: { prompt: 0 } },
            { id: 'model2', pricing: { prompt: 0.25 } }
          ]
        }
      });

      await modelsAction({});

      expect(mockFetchModels).toHaveBeenCalledWith('https://test-api.com');
      expect(writeJsonCache).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        models: expect.any(Array)
      }));

      const headerLine = console.log.mock.calls
        .map(([line]) => line)
        .find((line) => typeof line === 'string' && line.includes('RouterX Models'));
      expect(headerLine).toBeDefined();
    });

    test('filters by free flag and annotates header', async () => {
      validateApiKey.mockReturnValue('key');
      mockFetchModels.mockResolvedValue({
        data: {
          data: [
            { id: 'free-model:free', pricing: { prompt: 0 } },
            { id: 'paid-model', pricing: { prompt: 1 } }
          ]
        }
      });

      await modelsAction({ free: true });

      const header = console.log.mock.calls
        .map(([line]) => line)
        .find((line) => typeof line === 'string' && line.includes('RouterX Models (Free'));
      expect(header).toBeDefined();
    });

    test('filters by search keyword', async () => {
      validateApiKey.mockReturnValue('key');
      mockFetchModels.mockResolvedValue({
        data: {
          data: [
            { id: 'openai/gpt-4' },
            { id: 'mistral/mistral-large' }
          ]
        }
      });

      await modelsAction({ search: 'mistral' });
      const header = console.log.mock.calls
        .map(([line]) => line)
        .find((line) => typeof line === 'string' && line.includes('Search: "mistral"'));
      expect(header).toBeDefined();
    });

    test('filters by vendor prefix', async () => {
      validateApiKey.mockReturnValue('key');
      mockFetchModels.mockResolvedValue({
        data: {
          data: [
            { id: 'openai/gpt-4o-mini' },
            { id: 'mistral/mistral-large' }
          ]
        }
      });

      await modelsAction({ vendor: 'openai' });
      const tableLine = console.log.mock.calls
        .map(([line]) => line)
        .find((line) => typeof line === 'string' && line.includes('openai/gpt-4o-mini'));
      expect(tableLine).toBeDefined();
    });

    test('prints warning when no models match filters', async () => {
      validateApiKey.mockReturnValue('key');
      mockFetchModels.mockResolvedValue({
        data: { data: [{ id: 'paid-model', pricing: { prompt: 1 } }] }
      });

      await modelsAction({ free: true });
      const warningLine = console.log.mock.calls
        .map(([line]) => line)
        .find((line) => typeof line === 'string' && line.includes('No models found'));
      expect(warningLine).toBeDefined();
    });

    test('handles API errors gracefully', async () => {
      validateApiKey.mockReturnValue('key');
      const failure = new Error('boom');
      mockFetchModels.mockRejectedValue(failure);

      await modelsAction({});

      expect(handleError).toHaveBeenCalledWith(failure, 'MODEL_FETCH_ERROR', expect.objectContaining({
        operation: 'handleModelsCommand'
      }));
    });

    test('runs without API key', async () => {
      validateApiKey.mockReturnValue(null);
      mockFetchModels.mockResolvedValue({
        data: { data: [{ id: 'test-model' }] }
      });

      await modelsAction({});
      expect(mockFetchModels).toHaveBeenCalledWith('https://test-api.com');
    });

    test('outputs JSON when requested', async () => {
      validateApiKey.mockReturnValue('key');
      mockFetchModels.mockResolvedValue({
        data: { data: [{ id: 'openai/gpt-4o' }] }
      });

      await modelsAction({ json: true });
      const jsonCall = console.log.mock.calls
        .map(([line]) => line)
        .find((line) => typeof line === 'string' && line.trim().startsWith('{'));
      expect(jsonCall).toContain('"count":');
    });

    test('uses cached models when available', async () => {
      validateApiKey.mockReturnValue('key');
      readJsonCache.mockReturnValue({
        data: { models: [{ id: 'cached/model' }], fetchedAt: new Date().toISOString() },
        savedAt: Date.now()
      });
      mockFetchModels.mockResolvedValue({
        data: { data: [{ id: 'live/model' }] }
      });

      await modelsAction({});
      expect(mockFetchModels).not.toHaveBeenCalled();
      const tableLine = console.log.mock.calls
        .map(([line]) => line)
        .find((line) => typeof line === 'string' && line.includes('cached/model'));
      expect(tableLine).toBeDefined();
    });
  });

  describe('filterModels', () => {
    test('filters free models', () => {
      const models = [
        { id: 'free:free', pricing: { prompt: 0 } },
        { id: 'paid', pricing: { prompt: 1 } }
      ];

      const filtered = filterModels(models, { free: true });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('free:free');
    });

    test('filters vendor prefixes', () => {
      const models = [
        { id: 'openai/gpt-4' },
        { id: 'anthropic/claude' }
      ];

      const filtered = filterModels(models, { vendor: 'anthropic' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('anthropic/claude');
    });
  });
});
