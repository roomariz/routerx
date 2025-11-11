import { ConfigManager } from '../../infrastructure/config/index.js';
import { handleCodeCommand } from './handler.js';

// Initialize configuration manager and load config
const configManager = new ConfigManager();
const config = configManager.loadConfig();

/**
 * Register the code command with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerCodeCommand(program) {
  program
    .command('code')
    .description('AI code assistant (generate, explain, fix, review, diff)')
    .argument('[mode]', `Mode: generate | explain | fix | review | diff (default: generate)`)
    .argument('[target...]', 'Code file(s) or prompt')
    .option('--model <model>', `Force specific model ID (default: ${config.defaultModel})`)
    .option('--save <path>', 'Save output to file')
    .option('--context <dir>', 'Add folder context (default current dir)')
    .option('--free', 'Force only free model fallback')
    .option('--prefer <keyword>', 'Bias fallback model selection (e.g. coder, mistral, llama, qwen)')
    .action((mode, target, options) => handleCodeCommand(mode, target, options));
}

export default registerCodeCommand;