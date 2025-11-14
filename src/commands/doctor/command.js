import { RequestTracer } from '../../monitoring/tracer.js';
import { logger } from '../../monitoring/logger.js';
import { handleDoctorCommand } from './handler.js';

/**
 * Register the doctor command.
 * @param {import('commander').Command} program
 */
export function registerDoctorCommand(program) {
  program
    .command('doctor')
    .description('Run RouterX diagnostics (health, config, environment)')
    .option('--base-url <url>', 'Override API base URL for health checks')
    .option('--endpoint <path>', 'Override health endpoint')
    .option('--json', 'Output diagnostics as JSON')
    .action((options) =>
      RequestTracer.withTrace(
        'doctorCommand',
        async (traceId, traceLogger) => {
          await handleDoctorCommand(options, {
            logger: traceLogger,
            traceId
          });
        },
        {
          logger: logger.child({ command: 'doctor' })
        }
      )
    );
}

export default registerDoctorCommand;
