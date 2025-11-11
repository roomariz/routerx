// tests/unit/cliSetup.test.js
import { describe, test, expect } from '@jest/globals';
import { setupCLI } from '../../src/core/cliSetup.js';

// Mock the registerCommands function
jest.mock('../../src/cli/registerCommands.js', () => ({
  registerCommands: jest.fn()
}));

describe('CLISetup', () => {
  const { registerCommands } = require('../../src/cli/registerCommands.js');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupCLI', () => {
    test('calls registerCommands with the provided program', () => {
      const mockProgram = { some: 'program object' };

      setupCLI(mockProgram);

      expect(registerCommands).toHaveBeenCalledWith(mockProgram);
    });

    test('handles different program objects correctly', () => {
      const mockProgram1 = { name: 'program1' };
      const mockProgram2 = { name: 'program2' };

      setupCLI(mockProgram1);
      expect(registerCommands).toHaveBeenCalledWith(mockProgram1);

      setupCLI(mockProgram2);
      expect(registerCommands).toHaveBeenCalledWith(mockProgram2);
    });
  });
});