import { RequestTracer } from '../../monitoring/tracer.js';
import { logger } from '../../monitoring/logger.js';
import { handleInitCommand } from './handler.js';

/**
 * Register the init command.
 * @param {import('commander').Command} program
 */
export function registerInitCommand(program) {
  program
    .command('init')
    .description('Provision RouterX folders (outputs, cache) for a clean setup')
    .option('--output <dir>', 'Override the outputs directory path')
    .action((options) =>
      RequestTracer.withTrace(
        'initCommand',
        async (traceId, traceLogger) => {
          await handleInitCommand(options, {
            logger: traceLogger,
            traceId
          });
        },
        {
          logger: logger.child({ command: 'init' })
        }
      )
    );
}

export default registerInitCommand;
