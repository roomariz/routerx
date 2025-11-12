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
    .option('--timeout <ms>', `Override request timeout in milliseconds (default: ${config.resilience.timeoutMs})`)
    .option('--max-retries <count>', `Override maximum retry attempts (default: ${config.resilience.maxRetries})`)
    .option('--retry-base-delay <ms>', `Override initial retry backoff delay in milliseconds (default: ${config.resilience.baseDelayMs})`)
    .option('--retry-max-delay <ms>', `Override maximum retry backoff delay in milliseconds (default: ${config.resilience.maxDelayMs})`)
    .option('--retry-jitter <ms>', `Override retry jitter range in milliseconds (default: ${config.resilience.jitterMs})`)
    .option('--breaker-threshold <count>', `Override failures required to open the circuit breaker (default: ${config.resilience.breakerThreshold})`)
    .option('--breaker-cooldown <ms>', `Override circuit breaker cooldown in milliseconds (default: ${config.resilience.breakerCooldownMs})`)
    .action((options) => handleModelsCommand(options));
}

export default registerModelsCommand;