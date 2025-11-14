import { registerChatCommand } from '../commands/chat/index.js';
import { registerModelsCommand } from '../commands/models/index.js';
import { registerCodeCommand } from '../commands/code/index.js';
import { registerHealthCommand } from '../commands/health/index.js';
import { registerMetricsCommand } from '../commands/metrics/index.js';
import { registerDoctorCommand } from '../commands/doctor/index.js';
import { registerInitCommand } from '../commands/init/index.js';

/**
 * Register all commands with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerCommands(program) {
  registerChatCommand(program);
  registerModelsCommand(program);
  registerCodeCommand(program);
  registerHealthCommand(program);
  registerDoctorCommand(program);
  registerInitCommand(program);
  registerMetricsCommand(program);
}
