import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { handleChatCommand } from './handler.js';
import { RequestTracer } from '../../monitoring/tracer.js';
import { logger } from '../../monitoring/logger.js';

/**
 * Register the chat command with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerChatCommand(program) {
  const config = getRuntimeConfig();

  program
    .command('chat')
    .argument('<prompt>', 'Prompt to send to the model')
    .option('--model <model>', `Specify model name (default: ${config.defaultModel})`)
    .option('--base-url <url>', `Override API base URL (default: ${config.defaultBaseUrl})`)
    .option('--save <file>', 'Save the streamed reply to a text file')
    .option('--timeout <ms>', `Override request timeout in milliseconds (default: ${config.resilience.timeoutMs})`)
    .option('--max-retries <count>', `Override maximum retry attempts (default: ${config.resilience.maxRetries})`)
    .option('--retry-base-delay <ms>', `Override initial retry backoff delay in milliseconds (default: ${config.resilience.baseDelayMs})`)
    .option('--retry-max-delay <ms>', `Override maximum retry backoff delay in milliseconds (default: ${config.resilience.maxDelayMs})`)
    .option('--retry-jitter <ms>', `Override retry jitter range in milliseconds (default: ${config.resilience.jitterMs})`)
    .option('--breaker-threshold <count>', `Override failures required to open the circuit breaker (default: ${config.resilience.breakerThreshold})`)
    .option('--breaker-cooldown <ms>', `Override circuit breaker cooldown in milliseconds (default: ${config.resilience.breakerCooldownMs})`)
    .action((prompt, options) =>
      RequestTracer.withTrace(
        'chatCommand',
        async (traceId, traceLogger) => {
          await handleChatCommand(prompt, options, {
            logger: traceLogger,
            traceId
          });
        },
        {
          logger: logger.child({ command: 'chat' })
        }
      )
    );
}

export default registerChatCommand;
