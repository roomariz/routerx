import { RequestTracer } from '../../monitoring/tracer.js';
import { logger } from '../../monitoring/logger.js';
import { handleMetricsCommand } from './handler.js';

/**
 * Register the metrics command with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerMetricsCommand(program) {
  program
    .command('metrics')
    .description('Emit the in-memory RouterX metrics snapshot for diagnostics or CI artifacts')
    .option('--json', 'Print the metrics snapshot as JSON')
    .option('--output <path>', 'Write the metrics snapshot JSON to the specified file')
    .addHelpText(
      'after',
      `
Examples:
  $ routerx metrics
  $ routerx metrics --json
  $ routerx metrics --json --output ./artifacts/routerx-metrics.json
`
    )
    .action((options) =>
      RequestTracer.withTrace(
        'metricsCommand',
        async (traceId, traceLogger) => {
          await handleMetricsCommand(options, {
            logger: traceLogger,
            traceId
          });
        },
        {
          logger: logger.child({ command: 'metrics' })
        }
      )
    );
}

export default registerMetricsCommand;
