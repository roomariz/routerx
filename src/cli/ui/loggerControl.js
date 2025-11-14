// src/cli/ui/loggerControl.js
// Configures the shared logger so JSON logs only appear during verbose runs.

import { logger } from '../../monitoring/logger.js';

const defaultStream = logger.stream;

export function configureCliLogging(options = {}) {
  const verbose = Boolean(options.verbose);

  if (verbose) {
    logger.setJsonOutput(true);
    logger.setColorize(false);
    logger.setLevel(process.env.ROUTERX_LOG_LEVEL || 'info');
    logger.stream = defaultStream;
    return;
  }

  // Silence structured logs for regular CLI usage.
  logger.setJsonOutput(false);
  logger.setLevel('error');
  logger.stream = () => {};
}
