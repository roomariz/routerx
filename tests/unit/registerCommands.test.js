// tests/unit/registerCommands.test.js
import { describe, test, expect } from '@jest/globals';

// Mock the command registration functions
jest.mock('../../src/commands/chat/index.js', () => ({
  registerChatCommand: jest.fn()
}));

jest.mock('../../src/commands/models/index.js', () => ({
  registerModelsCommand: jest.fn()
}));

jest.mock('../../src/commands/code/index.js', () => ({
  registerCodeCommand: jest.fn()
}));

jest.mock('../../src/commands/health/index.js', () => ({
  registerHealthCommand: jest.fn()
}));

jest.mock('../../src/commands/metrics/index.js', () => ({
  registerMetricsCommand: jest.fn()
}));

describe('RegisterCommands', () => {
  const { registerChatCommand } = require('../../src/commands/chat/index.js');
  const { registerModelsCommand } = require('../../src/commands/models/index.js');
  const { registerCodeCommand } = require('../../src/commands/code/index.js');
  const { registerHealthCommand } = require('../../src/commands/health/index.js');
  const { registerMetricsCommand } = require('../../src/commands/metrics/index.js');
  const { registerCommands } = require('../../src/cli/registerCommands.js');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCommands', () => {
    test('registers all commands with the program', () => {
      const mockProgram = { some: 'program object' };

      registerCommands(mockProgram);

      expect(registerChatCommand).toHaveBeenCalledWith(mockProgram);
      expect(registerModelsCommand).toHaveBeenCalledWith(mockProgram);
      expect(registerCodeCommand).toHaveBeenCalledWith(mockProgram);
      expect(registerHealthCommand).toHaveBeenCalledWith(mockProgram);
      expect(registerMetricsCommand).toHaveBeenCalledWith(mockProgram);
    });

    test('calls each registration function exactly once', () => {
      const mockProgram = { commands: [] };

      registerCommands(mockProgram);

      expect(registerChatCommand).toHaveBeenCalledTimes(1);
      expect(registerModelsCommand).toHaveBeenCalledTimes(1);
      expect(registerCodeCommand).toHaveBeenCalledTimes(1);
      expect(registerHealthCommand).toHaveBeenCalledTimes(1);
      expect(registerMetricsCommand).toHaveBeenCalledTimes(1);
    });

    test('registers commands with different program objects correctly', () => {
      const mockProgram1 = { name: 'program1' };
      const mockProgram2 = { name: 'program2' };

      registerCommands(mockProgram1);
      registerCommands(mockProgram2);

      expect(registerChatCommand).toHaveBeenCalledTimes(2);
      expect(registerModelsCommand).toHaveBeenCalledTimes(2);
      expect(registerCodeCommand).toHaveBeenCalledTimes(2);
      expect(registerHealthCommand).toHaveBeenCalledTimes(2);
      expect(registerMetricsCommand).toHaveBeenCalledTimes(2);
      expect(registerChatCommand).toHaveBeenCalledWith(mockProgram1);
      expect(registerChatCommand).toHaveBeenCalledWith(mockProgram2);
      expect(registerHealthCommand).toHaveBeenCalledWith(mockProgram1);
      expect(registerHealthCommand).toHaveBeenCalledWith(mockProgram2);
      expect(registerMetricsCommand).toHaveBeenCalledWith(mockProgram1);
      expect(registerMetricsCommand).toHaveBeenCalledWith(mockProgram2);
    });
  });
});
