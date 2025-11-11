import { registerChatCommand } from '../commands/chat/index.js';
import { registerModelsCommand } from '../commands/models/index.js';
import { registerCodeCommand } from '../commands/code/index.js';

/**
 * Register all commands with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerCommands(program) {
  registerChatCommand(program);
  registerModelsCommand(program);
  registerCodeCommand(program);
}