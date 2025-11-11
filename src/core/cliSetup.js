import { registerCommands } from '../cli/registerCommands.js';

/**
 * Setup CLI by registering all commands
 * @param {import('commander').Command} program - The Commander program instance
 */
export function setupCLI(program) {
  registerCommands(program);
}