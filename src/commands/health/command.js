import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { RequestTracer } from '../../monitoring/tracer.js';
import { logger } from '../../monitoring/logger.js';
import { handleHealthCommand } from './handler.js';

/**
 * Register the health command with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerHealthCommand(program) {
  const config = getRuntimeConfig();
  const timeout = config?.resilience?.timeoutMs ?? config?.timeout ?? 5000;

  program
    .command('health')
    .description('Check RouterX runtime, API connectivity, credentials, and filesystem readiness')
    .option('--base-url <url>', `Override API base URL (default: ${config.defaultBaseUrl})`)
    .option('--endpoint <path>', 'Override health endpoint path (default: /health)')
    .option('--timeout <ms>', `Override health check timeout in milliseconds (default: ${timeout})`)
    .option('--json', 'Output the health report as JSON for scripts and CI pipelines')
    .addHelpText('after', `
Examples:
  $ routerx health
  $ routerx health --json | jq '.status'
`)
    .action((options) =>
      RequestTracer.withTrace(
        'healthCommand',
        async (traceId, traceLogger) => {
          await handleHealthCommand(options, {
            logger: traceLogger,
            traceId
          });
        },
        {
          logger: logger.child({ command: 'health' })
        }
      )
    );
}

export default registerHealthCommand;
