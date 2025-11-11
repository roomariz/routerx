// tests/unit/registerCommands.test.js
import { describe, test, expect } from '@jest/globals';

// Mock the command registration functions
jest.mock('../../src/commands/chat.js', () => ({
  registerChatCommand: jest.fn()
}));

jest.mock('../../src/commands/models.js', () => ({
  registerModelsCommand: jest.fn()
}));

jest.mock('../../src/commands/code.js', () => ({
  registerCodeCommand: jest.fn()
}));

describe('RegisterCommands', () => {
  const { registerChatCommand } = require('../../src/commands/chat.js');
  const { registerModelsCommand } = require('../../src/commands/models.js');
  const { registerCodeCommand } = require('../../src/commands/code.js');
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
    });

    test('calls each registration function exactly once', () => {
      const mockProgram = { commands: [] };

      registerCommands(mockProgram);

      expect(registerChatCommand).toHaveBeenCalledTimes(1);
      expect(registerModelsCommand).toHaveBeenCalledTimes(1);
      expect(registerCodeCommand).toHaveBeenCalledTimes(1);
    });

    test('registers commands with different program objects correctly', () => {
      const mockProgram1 = { name: 'program1' };
      const mockProgram2 = { name: 'program2' };

      registerCommands(mockProgram1);
      registerCommands(mockProgram2);

      expect(registerChatCommand).toHaveBeenCalledTimes(2);
      expect(registerModelsCommand).toHaveBeenCalledTimes(2);
      expect(registerCodeCommand).toHaveBeenCalledTimes(2);
      expect(registerChatCommand).toHaveBeenCalledWith(mockProgram1);
      expect(registerChatCommand).toHaveBeenCalledWith(mockProgram2);
    });
  });
});