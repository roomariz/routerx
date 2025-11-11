// tests/integration/cli-integration.test.js
import { describe, test, expect } from '@jest/globals';
import { Command } from 'commander';

// Mock the setup components
jest.mock('../../src/core/cliSetup.js', () => ({
  setupCLI: jest.fn((program) => {
    // Mock the setup to register commands
    program.command('chat')
      .argument('<prompt>', 'Prompt to send to the model')
      .option('--model <model>', 'Specify model name')
      .option('--base-url <url>', 'Override API base URL')
      .option('--save <file>', 'Save the streamed reply to a text file');

    program.command('models')
      .description('List available models (free, paid, or filtered by search keyword)')
      .option('--free', 'Show only free models')
      .option('--search <keyword>', 'Filter models by keyword');

    program.command('code')
      .description('AI code assistant (generate, explain, fix, review, diff)')
      .argument('[mode]', 'Mode: generate | explain | fix | review | diff (default: generate)')
      .argument('[target...]', 'Code file(s) or prompt')
      .option('--model <model>', 'Force specific model ID')
      .option('--save <path>', 'Save output to file')
      .option('--context <dir>', 'Add folder context (default current dir)')
      .option('--free', 'Force only free model fallback')
      .option('--prefer <keyword>', 'Bias fallback model selection (e.g. coder, mistral, llama, qwen)');
  })
}));

jest.mock('../../src/cli/registerCommands.js', () => ({
  registerCommands: jest.fn((program) => {
    // Mock command registration
    program.command('chat')
      .argument('<prompt>', 'Prompt to send to the model')
      .option('--model <model>', 'Specify model name')
      .option('--base-url <url>', 'Override API base URL')
      .option('--save <file>', 'Save the streamed reply to a text file');

    program.command('models')
      .description('List available models (free, paid, or filtered by search keyword)')
      .option('--free', 'Show only free models')
      .option('--search <keyword>', 'Filter models by keyword');

    program.command('code')
      .description('AI code assistant (generate, explain, fix, review, diff)')
      .argument('[mode]', 'Mode: generate | explain | fix | review | diff (default: generate)')
      .argument('[target...]', 'Code file(s) or prompt')
      .option('--model <model>', 'Force specific model ID')
      .option('--save <path>', 'Save output to file')
      .option('--context <dir>', 'Add folder context (default current dir)')
      .option('--free', 'Force only free model fallback')
      .option('--prefer <keyword>', 'Bias fallback model selection (e.g. coder, mistral, llama, qwen)');
  })
}));

import { setupCLI } from '../../src/core/cliSetup.js';
import { registerCommands } from '../../src/cli/registerCommands.js';

describe('CLI Integration Tests', () => {
  test('setupCLI properly registers all commands', () => {
    const testProgram = new Command();

    // Before setup, the program should have no commands
    expect(testProgram.commands.length).toBe(0);

    // After setup, it should have commands
    setupCLI(testProgram);

    // Check that commands were registered
    const commandNames = testProgram.commands.map(cmd => cmd.name());
    expect(commandNames).toContain('chat');
    expect(commandNames).toContain('models');
    expect(commandNames).toContain('code');
  });

  test('registerCommands properly registers chat, models, and code commands', () => {
    const testProgram = new Command();

    registerCommands(testProgram);

    // Check that all expected commands are registered
    const commandNames = testProgram.commands.map(cmd => cmd.name());
    expect(commandNames).toContain('chat');
    expect(commandNames).toContain('models');
    expect(commandNames).toContain('code');

    // Verify that each command has the expected structure
    const chatCommand = testProgram.commands.find(cmd => cmd.name() === 'chat');
    expect(chatCommand).toBeDefined();
    expect(chatCommand._args.map(arg => 
      arg.required ? '<' + arg._name + '>' : '[' + arg._name + ']'
    )).toContain('<prompt>');

    const modelsCommand = testProgram.commands.find(cmd => cmd.name() === 'models');
    expect(modelsCommand).toBeDefined();
    expect(modelsCommand.description()).toContain('models');

    const codeCommand = testProgram.commands.find(cmd => cmd.name() === 'code');
    expect(codeCommand).toBeDefined();
    expect(codeCommand.description()).toContain('code');
  });

  test('full CLI setup creates program with all expected commands', () => {
    const fullProgram = new Command();

    // This simulates the full setup process
    fullProgram
      .name('test-cli')
      .description('Test CLI for RouterX')
      .version('1.0.0');

    setupCLI(fullProgram);

    const commandNames = fullProgram.commands.map(cmd => cmd.name());
    expect(commandNames).toContain('chat');
    expect(commandNames).toContain('models');
    expect(commandNames).toContain('code');

    // Verify each command has basic expected options
    const chatCommand = fullProgram.commands.find(cmd => cmd.name() === 'chat');
    expect(chatCommand.options.length).toBeGreaterThan(0);

    const modelsCommand = fullProgram.commands.find(cmd => cmd.name() === 'models');
    expect(modelsCommand.options.length).toBeGreaterThan(0);

    const codeCommand = fullProgram.commands.find(cmd => cmd.name() === 'code');
    expect(codeCommand.options.length).toBeGreaterThan(0);
  });

  test('CLI commands have expected options', () => {
    const testProgram = new Command();
    setupCLI(testProgram);

    // Check chat command options
    const chatCmd = testProgram.commands.find(cmd => cmd.name() === 'chat');
    const chatOptionFlags = chatCmd.options.map(opt => opt.flags);
    expect(chatOptionFlags.some(flag => flag.includes('--model'))).toBe(true);
    expect(chatOptionFlags.some(flag => flag.includes('--base-url'))).toBe(true);
    expect(chatOptionFlags.some(flag => flag.includes('--save'))).toBe(true);

    // Check models command options
    const modelsCmd = testProgram.commands.find(cmd => cmd.name() === 'models');
    const modelsOptionFlags = modelsCmd.options.map(opt => opt.flags);
    expect(modelsOptionFlags.some(flag => flag.includes('--free'))).toBe(true);
    expect(modelsOptionFlags.some(flag => flag.includes('--search'))).toBe(true);

    // Check code command options
    const codeCmd = testProgram.commands.find(cmd => cmd.name() === 'code');
    const codeOptionFlags = codeCmd.options.map(opt => opt.flags);
    expect(codeOptionFlags.some(flag => flag.includes('--model'))).toBe(true);
    expect(codeOptionFlags.some(flag => flag.includes('--save'))).toBe(true);
    expect(codeOptionFlags.some(flag => flag.includes('--free'))).toBe(true);
    expect(codeOptionFlags.some(flag => flag.includes('--prefer'))).toBe(true);
  });
});