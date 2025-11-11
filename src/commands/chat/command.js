import { ConfigManager } from '../../infrastructure/config/index.js';
import { handleChatCommand } from './handler.js';

// Initialize configuration manager and load config
const configManager = new ConfigManager();
const config = configManager.loadConfig();

/**
 * Register the chat command with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerChatCommand(program) {
  program
    .command('chat')
    .argument('<prompt>', 'Prompt to send to the model')
    .option('--model <model>', `Specify model name (default: ${config.defaultModel})`)
    .option('--base-url <url>', `Override API base URL (default: ${config.defaultBaseUrl})`)
    .option('--save <file>', 'Save the streamed reply to a text file')
    .action((prompt, options) => handleChatCommand(prompt, options));
}

export default registerChatCommand;