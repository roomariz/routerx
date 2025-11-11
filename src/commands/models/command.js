import { ConfigManager } from '../../infrastructure/config/index.js';
import { handleModelsCommand } from './handler.js';

// Initialize configuration manager and load config
const configManager = new ConfigManager();
const config = configManager.loadConfig();

/**
 * Register the models command with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerModelsCommand(program) {
  program
    .command('models')
    .description('List available models (free, paid, or filtered by search keyword)')
    .option('--free', 'Show only free models')
    .option('--search <keyword>', 'Filter models by keyword (e.g. mistral, vision, llama)')
    .action((options) => handleModelsCommand(options));
}

export default registerModelsCommand;