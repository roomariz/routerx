import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { handleCodeCommand } from './handler.js';
import { RequestTracer } from '../../monitoring/tracer.js';
import { logger } from '../../monitoring/logger.js';

/**
 * Register the code command with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerCodeCommand(program) {
  const config = getRuntimeConfig();

  program
    .command('code')
    .description('AI code assistant (generate, explain, fix, review, diff)')
    .argument('[mode]', `Mode: generate | explain | fix | review | diff (default: generate)`)
    .argument('[target...]', 'Code file(s) or prompt')
    .option('--model <model>', `Force specific model ID (default: ${config.defaultModel})`)
    .option('--save <path>', 'Save output to file')
    .option('--context [dir]', 'Add folder context (defaults to current directory when omitted)')
    .option('--free', 'Use only free models and auto-select the best candidate')
    .option('--prefer <keyword>', 'Bias fallback model selection (e.g. coder, mistral, llama, qwen)')
    .option('--timeout <ms>', `Override request timeout in milliseconds (default: ${config.resilience.timeoutMs})`)
    .option('--max-retries <count>', `Override maximum retry attempts (default: ${config.resilience.maxRetries})`)
    .option('--retry-base-delay <ms>', `Override initial retry backoff delay in milliseconds (default: ${config.resilience.baseDelayMs})`)
    .option('--retry-max-delay <ms>', `Override maximum retry backoff delay in milliseconds (default: ${config.resilience.maxDelayMs})`)
    .option('--retry-jitter <ms>', `Override retry jitter range in milliseconds (default: ${config.resilience.jitterMs})`)
    .option('--breaker-threshold <count>', `Override failures required to open the circuit breaker (default: ${config.resilience.breakerThreshold})`)
    .option('--breaker-cooldown <ms>', `Override circuit breaker cooldown in milliseconds (default: ${config.resilience.breakerCooldownMs})`)
    .action((mode, target, options) =>
      RequestTracer.withTrace(
        'codeCommand',
        async (traceId, traceLogger) => {
          await handleCodeCommand(mode, target, options, {
            logger: traceLogger,
            traceId
          });
        },
        {
          logger: logger.child({ command: 'code' })
        }
      )
    );
}

export default registerCodeCommand;
