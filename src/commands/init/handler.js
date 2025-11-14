import fs from 'fs';
import path from 'path';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { logger as baseLogger } from '../../monitoring/logger.js';
import { handleError } from '../../shared/utils/error.js';
import { sectionTitle, divider, tipLine } from '../../cli/ui/layout.js';
import { palette } from '../../cli/ui/theme.js';

/**
 * Provision RouterX workspace folders.
 * @param {Object} options
 */
export async function handleInitCommand(options = {}, context = {}) {
  const config = getRuntimeConfig();
  const { logger: commandLogger = baseLogger, traceId } = context;

  try {
    const targets = buildTargets(config, options);
    const results = targets.map((target) => ensureDirectory(target, commandLogger, traceId));
    const failed = results.filter((entry) => entry.status === 'error');

    renderInitSummary(results);

    if (failed.length > 0) {
      process.exitCode = 1;
    }

    return results;
  } catch (error) {
    commandLogger.error('Init command failed', { error, traceId });
    handleError(error, 'INIT_COMMAND_FAILED', {
      operation: 'handleInitCommand',
      options,
      traceId
    });
    process.exitCode = 1;
    return null;
  }
}

function buildTargets(config, options) {
  const outputOverride = options.output || config.defaultSavePath || './outputs';
  const directories = new Map();
  directories.set('Outputs', path.resolve(outputOverride));
  directories.set('Cache', path.resolve(process.cwd(), '.routerx-cache'));

  return Array.from(directories, ([label, dirPath]) => ({ label, path: dirPath }));
}

function ensureDirectory(target, logger, traceId) {
  try {
    if (!fs.existsSync(target.path)) {
      fs.mkdirSync(target.path, { recursive: true });
      return { ...target, status: 'created' };
    }

    return { ...target, status: 'exists' };
  } catch (error) {
    logger.error('Failed to provision directory', { path: target.path, error, traceId });
    return { ...target, status: 'error', error: error.message };
  }
}

function renderInitSummary(results) {
  console.log(sectionTitle('🛠 RouterX Init'));
  console.log(divider());

  results.forEach((entry) => {
    if (entry.status === 'created') {
      console.log(`${palette.success('✅ Created')} ${entry.label}: ${entry.path}`);
    } else if (entry.status === 'exists') {
      console.log(`${palette.info('🟢 Ready')} ${entry.label}: ${entry.path}`);
    } else {
      console.log(`${palette.danger('❌ Failed')} ${entry.label}: ${entry.path}`);
      if (entry.error) {
        console.log(palette.muted(`    ${entry.error}`));
      }
    }
  });

  console.log('');
  console.log(tipLine('You can override the output path via --output <dir>'));
  console.log('');
}
