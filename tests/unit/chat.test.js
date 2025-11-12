// tests/unit/chat.test.js - properly structured to handle dependency mocking
import { jest } from '@jest/globals';

// Mock all dependencies BEFORE importing the module under test
jest.mock('chalk', () => ({
  dim: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  green: jest.fn((str) => str)
}));

jest.mock('../../src/infrastructure/config/runtimeConfig.js', () => {
  const mockConfig = {
    defaultModel: 'test-model',
    defaultBaseUrl: 'https://test.example.com',
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

jest.mock('../../src/infrastructure/api/index.js', () => {
  const mockApiClient = {
    makeChatCompletion: jest.fn(() => Promise.resolve({ data: { on: jest.fn() } })),
    fetchModels: jest.fn(),
    makeGeneralChat: jest.fn()
  };

  const MockApiClient = jest.fn(() => mockApiClient);

  return {
    default: MockApiClient,
    ApiClient: MockApiClient
  };
});

// Mock other dependencies that the handler imports
jest.mock('../../src/shared/constants/index.js', () => ({
  ERROR_MESSAGES: {
    MISSING_API_KEY: '❌ Missing API key',
    REQUEST_ERROR: '❌ Error processing request'
  },
  LOG_MESSAGES: {
    SENDING_TO_MODEL: '🧠 Sending to model: ',
    API_BASE_URL: '🔗 API Base URL: ',
    PROMPT_INFO: '📝 Prompt: ',
    REPLY_STREAMING: '💬 Reply (streaming):\n'
  },
  DEFAULT_VALUES: {
    MODEL: 'openai/gpt-4o-mini'
  }
}));

jest.mock('../../src/shared/utils/file.js', () => ({
  formatTimestamp: jest.fn(() => '[12:00:00]')
}));

jest.mock('../../src/shared/utils/auth.js', () => ({
  validateApiKey: jest.fn(() => 'test-api-key')
}));

jest.mock('../../src/shared/utils/stream.js', () => ({
  handleStream: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/shared/utils/error.js', () => ({
  handleError: jest.fn()
}));

// Now import after all mocks are set up
import { handleChatCommand } from '../../src/commands/chat/handler.js';

describe('Chat Command Handler', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    jest.clearAllMocks();
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
