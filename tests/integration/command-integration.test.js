// tests/integration/command-integration.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';

// Define persistent mock functions at the test file scope
let mockMakeChatCompletion, mockFetchModels, mockMakeGeneralChat;

// Mock external dependencies that would make real API calls
jest.mock('../../src/infrastructure/api/index.js', () => {
  // Initialize the mock functions
  mockMakeChatCompletion = jest.fn();
  mockFetchModels = jest.fn();
  mockMakeGeneralChat = jest.fn();

  // Array to store all instances that get created (inside the mock)
  const createdApiClientInstances = [];

  const MockConstructor = jest.fn(() => {
    const instance = {
      makeChatCompletion: mockMakeChatCompletion,
      fetchModels: mockFetchModels,
      makeGeneralChat: mockMakeGeneralChat
    };
    createdApiClientInstances.push(instance);
    return instance;
  });

  // Add a way to access the instances from outside the mock
  MockConstructor.getCreatedInstances = () => createdApiClientInstances;

  return {
    default: MockConstructor,
    ApiClient: MockConstructor
  };
});

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

jest.mock('../../src/shared/utils/auth.js', () => ({
  validateApiKey: jest.fn(() => 'test-api-key'),
  exitWithError: jest.fn()
}));

jest.mock('../../src/shared/utils/error.js', () => ({
  handleError: jest.fn(),
  handleAPIError: jest.fn(error => error),
  exitWithError: jest.fn()
}));

jest.mock('../../src/shared/utils/file.js', () => ({
  fileExists: jest.fn(() => true),
  readFileContent: jest.fn(() => 'test file content'),
  writeFileContent: jest.fn(),
  ensureDirectory: jest.fn(),
  formatTimestamp: jest.fn(() => '[12:00:00]'),
  normalizePath: jest.fn(p => p),
  resolvePath: jest.fn(p => p)
}));

jest.mock('../../src/shared/utils/stream.js', () => ({
  handleStream: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/shared/utils/cache.js', () => ({
  readJsonCache: jest.fn(() => null),
  writeJsonCache: jest.fn()
}));

// Import after mocking
const { registerChatCommand } = require('../../src/commands/chat/index.js');
const { registerModelsCommand } = require('../../src/commands/models/index.js');
const { registerCodeCommand } = require('../../src/commands/code/index.js');

describe('Command Integration Tests', () => {
  let mockProgram;
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

  test('chat command integration - command registration and execution', async () => {
    const { handleChatCommand } = require('../../src/commands/chat/index.js');
    
    // Set up the mock before executing the command
    const mockStream = { on: jest.fn() };
    mockMakeChatCompletion.mockResolvedValue({ data: mockStream });

    // Register the chat command
    registerChatCommand(mockProgram);
    
    // Verify the command was registered correctly
    const chatCmd = mockProgram.commands.find(cmd => cmd.name() === 'chat');
    expect(chatCmd).toBeDefined();
    expect(chatCmd.name()).toBe('chat');
    // The chat command doesn't have an explicit description, so check for its argument instead
    expect(chatCmd._args).toBeDefined();
    expect(chatCmd._args.length).toBeGreaterThan(0);
    
    // Verify argument format
    expect(chatCmd._args).toBeDefined();
    expect(chatCmd._args.length).toBeGreaterThan(0);
    if (chatCmd._args.length > 0) {
      // Reconstruct the argument format to match expected format in Commander.js v14
      const firstArgFormat = chatCmd._args[0].required ? '<' + chatCmd._args[0]._name + '>' : '[' + chatCmd._args[0]._name + ']';
      expect(firstArgFormat).toBe('<prompt>');
    }

    // Execute the command handler directly
    await handleChatCommand('Test prompt', { model: 'test-model' });

    // The handler should have created an ApiClient instance
    // Verify API was called with correct parameters
    expect(mockMakeChatCompletion).toHaveBeenCalledWith(
      'test-api-key',
      'test-model',
      'Test prompt',
      'https://test-api.com'
    );
  });

  test('models command integration - command registration and execution', async () => {
    const { handleModelsCommand } = require('../../src/commands/models/index.js');
    
    // Set up the mock before executing the command
    const mockResponse = {
      data: {
        data: [
          { id: 'test-model-free', pricing: { prompt: 0 } },
          { id: 'test-model-paid', pricing: { prompt: 1 } }
        ]
      }
    };
    mockFetchModels.mockResolvedValue(mockResponse);

    // Register the models command
    registerModelsCommand(mockProgram);
    
    // Verify the command was registered correctly
    const modelsCmd = mockProgram.commands.find(cmd => cmd.name() === 'models');
    expect(modelsCmd).toBeDefined();
    expect(modelsCmd.name()).toBe('models');
    expect(modelsCmd.description()).toContain('models');

    // Execute the command handler directly
    await handleModelsCommand({});

    // Verify API was called
    expect(mockFetchModels).toHaveBeenCalledWith('https://test-api.com');
  });

  test('code command integration - command registration and execution', async () => {
    // Set up the mock before executing the command
    mockMakeGeneralChat.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Generated code' } }]
      }
    });

    // Register the code command
    registerCodeCommand(mockProgram);
    
    // Verify the command was registered correctly
    const codeCmd = mockProgram.commands.find(cmd => cmd.name() === 'code');
    expect(codeCmd).toBeDefined();
    expect(codeCmd.name()).toBe('code');
    expect(codeCmd.description()).toContain('code');

    // Execute the command handler directly - import after mocking to ensure proper behavior
    const { handleCodeCommand } = require('../../src/commands/code/index.js');
    await handleCodeCommand('generate', ['console.log("hello");'], { model: 'test-model' });

    // Verify API was called with correct parameters
    expect(mockMakeGeneralChat).toHaveBeenCalledWith(
      'test-api-key',
      'test-model',
      'console.log("hello");',
      'https://test-api.com'
    );
  });

  test('command interactions with util functions work correctly', async () => {
    // Test that commands properly interact with utilities
    const { fileExists, readFileContent } = require('../../src/shared/utils/file.js');
    const { handleCodeCommand } = require('../../src/commands/code/index.js');
    
    // Set up mocks before executing the command
    fileExists.mockReturnValue(true);
    readFileContent.mockReturnValue('function test() { return "hello"; }');
    mockMakeGeneralChat.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Function explanation' } }]
      }
    });
    
    registerCodeCommand(mockProgram);
    
    // Execute the command handler directly
    await handleCodeCommand('explain', ['test.js'], {});
    
    // Verify that file operations were called
    expect(fileExists).toHaveBeenCalledWith('test.js');
    expect(readFileContent).toHaveBeenCalledWith('test.js');
    
    // Verify that the API was called with the content of the file
    expect(mockMakeGeneralChat).toHaveBeenCalledWith(
      'test-api-key',
      'test-model',
      expect.stringContaining('Explain what this code does'),
      'https://test-api.com'
    );
  });

  test('command option parsing and handling works end-to-end', async () => {
    // Test chat command with multiple options
    const { handleChatCommand } = require('../../src/commands/chat/index.js');
    const mockStream = { on: jest.fn() };
    mockMakeChatCompletion.mockResolvedValue({ data: mockStream });

    registerChatCommand(mockProgram);

    // Execute with multiple options using the handler directly
    await handleChatCommand('Test prompt', {
      model: 'custom-model',
      baseUrl: 'https://custom-api.com',
      save: './output.txt'
    });

    // Verify API was called with the specified options
    expect(mockMakeChatCompletion).toHaveBeenCalledWith(
      'test-api-key',
      'custom-model',
      'Test prompt',
      'https://custom-api.com'
    );
  });
});
