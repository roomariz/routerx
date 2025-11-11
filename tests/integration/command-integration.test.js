// tests/integration/command-integration.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Command } from 'commander';

// Mock external dependencies that would make real API calls
jest.mock('../../src/infrastructure/api/index.js', () => {
  return jest.fn().mockImplementation(() => ({
    makeChatCompletion: jest.fn(),
    fetchModels: jest.fn(),
    makeGeneralChat: jest.fn()
  }));
});

jest.mock('../../src/infrastructure/config/index.js', () => {
  return jest.fn().mockImplementation(() => ({
    loadConfig: jest.fn(() => ({
      defaultModel: 'test-model',
      defaultBaseUrl: 'https://test-api.com',
      defaultSavePath: './outputs'
    }))
  }));
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
    // Register the chat command
    registerChatCommand(mockProgram);
    
    // Verify the command was registered correctly
    const chatCmd = mockProgram.commands.find(cmd => cmd.name() === 'chat');
    expect(chatCmd).toBeDefined();
    expect(chatCmd._args).toBeDefined();
    expect(chatCmd._args.length).toBeGreaterThan(0);
    if (chatCmd._args.length > 0) {
      expect(chatCmd._args[0].arg).toBe('<prompt>');
    }
    
    // Get the API client instance that was created
    const ApiClient = require('../../src/infrastructure/api/index.js');
    const apiClientInstance = ApiClient.mock.instances[0];
    const mockStream = { on: jest.fn() };
    apiClientInstance.makeChatCompletion.mockResolvedValue({ data: mockStream });
    
    // Execute the command
    const chatAction = chatCmd._actionHandler._fn;
    await chatAction('Test prompt', { model: 'test-model' });
    
    // Verify API was called with correct parameters
    expect(apiClientInstance.makeChatCompletion).toHaveBeenCalledWith(
      'test-api-key',
      'test-model',
      'Test prompt',
      'https://test-api.com'
    );
  });

  test('models command integration - command registration and execution', async () => {
    // Register the models command
    registerModelsCommand(mockProgram);
    
    // Verify the command was registered correctly
    const modelsCmd = mockProgram.commands.find(cmd => cmd.name() === 'models');
    expect(modelsCmd).toBeDefined();
    expect(modelsCmd.description()).toContain('models');
    
    // Get the API client instance that was created
    const ApiClient = require('../../src/infrastructure/api/index.js');
    const apiClientInstance = ApiClient.mock.instances[0];
    apiClientInstance.fetchModels.mockResolvedValue({
      data: {
        data: [
          { id: 'test-model-free', pricing: { prompt: 0 } },
          { id: 'test-model-paid', pricing: { prompt: 1 } }
        ]
      }
    });
    
    // Execute the command
    const modelsAction = modelsCmd._actionHandler._fn;
    await modelsAction({});
    
    // Verify API was called
    expect(apiClientInstance.fetchModels).toHaveBeenCalledWith('https://test-api.com');
  });

  test('code command integration - command registration and execution', async () => {
    // Register the code command
    registerCodeCommand(mockProgram);
    
    // Verify the command was registered correctly
    const codeCmd = mockProgram.commands.find(cmd => cmd.name() === 'code');
    expect(codeCmd).toBeDefined();
    expect(codeCmd.description()).toContain('code');
    
    // Get the API client instance that was created
    const ApiClient = require('../../src/infrastructure/api/index.js');
    const apiClientInstance = ApiClient.mock.instances[0];
    apiClientInstance.makeGeneralChat.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Generated code' } }]
      }
    });
    
    // Execute the command in generate mode
    const codeAction = codeCmd._actionHandler._fn;
    await codeAction('generate', ['console.log("hello");'], { model: 'test-model' });
    
    // Verify API was called with correct parameters
    expect(apiClientInstance.makeGeneralChat).toHaveBeenCalledWith(
      'test-api-key',
      'test-model',
      'console.log("hello");',
      'https://test-api.com'
    );
  });

  test('command interactions with util functions work correctly', async () => {
    // Test that commands properly interact with utilities
    registerCodeCommand(mockProgram);
    
    const codeCmd = mockProgram.commands.find(cmd => cmd.name() === 'code');
    const codeAction = codeCmd._actionHandler._fn;
    
    // Mock dependencies
    const ApiClient = require('../../src/infrastructure/api/index.js');
    const { fileExists, readFileContent } = require('../../src/shared/utils/file.js');
    const apiClientInstance = ApiClient.mock.instances[0];
    
    // Mock files for the explain mode
    fileExists.mockReturnValue(true);
    readFileContent.mockReturnValue('function test() { return "hello"; }');
    apiClientInstance.makeGeneralChat.mockResolvedValue({
      data: {
        choices: [{ message: { content: 'Function explanation' } }]
      }
    });
    
    // Execute explain mode with a file
    await codeAction('explain', ['test.js'], {});
    
    // Verify that file operations were called
    expect(fileExists).toHaveBeenCalledWith('test.js');
    expect(readFileContent).toHaveBeenCalledWith('test.js');
    
    // Verify that the API was called with the content of the file
    expect(apiClientInstance.makeGeneralChat).toHaveBeenCalledWith(
      'test-api-key',
      'test-model',
      expect.stringContaining('Explain what this code does'),
      'https://test-api.com'
    );
  });

  test('command option parsing and handling works end-to-end', async () => {
    // Test chat command with multiple options
    registerChatCommand(mockProgram);
    
    const chatCmd = mockProgram.commands.find(cmd => cmd.name() === 'chat');
    const chatAction = chatCmd._actionHandler._fn;
    
    // Get the API client instance that was created
    const ApiClient = require('../../src/infrastructure/api/index.js');
    const apiClientInstance = ApiClient.mock.instances[0];
    const mockStream = { on: jest.fn() };
    apiClientInstance.makeChatCompletion.mockResolvedValue({ data: mockStream });
    
    // Execute with multiple options
    await chatAction('Test prompt', {
      model: 'custom-model',
      baseUrl: 'https://custom-api.com',
      save: './output.txt'
    });
    
    // Verify API was called with the specified options
    expect(apiClientInstance.makeChatCompletion).toHaveBeenCalledWith(
      'test-api-key',
      'custom-model',
      'Test prompt',
      'https://custom-api.com'
    );
  });
});