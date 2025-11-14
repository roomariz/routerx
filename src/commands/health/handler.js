import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { HealthChecker, healthCheckerStatus } from '../../monitoring/health.js';
import { logger as baseLogger } from '../../monitoring/logger.js';
import { handleError } from '../../shared/utils/error.js';
import { sectionTitle, divider, tipLine } from '../../cli/ui/layout.js';
import { formatStatusBadge, palette } from '../../cli/ui/theme.js';
import { isVerboseMode } from '../../cli/state/session.js';

function parseTimeout(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Handle the health command action
 * @param {Object} options - Command options
 */
export async function handleHealthCommand(options = {}, context = {}) {
  const config = getRuntimeConfig();
  const { logger: commandLogger = baseLogger, traceId } = context;

  try {
    const timeoutOverride = parseTimeout(options.timeout);
    const scopedLogger = commandLogger.child?.({ component: 'HealthChecker', traceId }) ?? commandLogger;

    const healthChecker = new HealthChecker(config, {
      logger: scopedLogger,
      timeoutMs: timeoutOverride,
      healthEndpoint: options.endpoint
    });

    const report = await healthChecker.fullHealthCheck({
      baseUrl: options.baseUrl,
      endpoint: options.endpoint,
      timeoutMs: timeoutOverride
    });

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      renderHealthReport(report, { verbose: isVerboseMode() });
    }

    commandLogger.info('Health checks completed', {
      status: report.status,
      summary: report.summary,
      traceId
    });

    if (report.status !== healthCheckerStatus.HEALTHY) {
      process.exitCode = 1;
    }

    return report;
  } catch (error) {
    commandLogger.error('Health checks failed', { error, traceId });
    handleError(error, 'HEALTH_CHECK_FAILED', {
      operation: 'handleHealthCommand',
      options,
      traceId
    });
    process.exitCode = 1;
    return null;
  }
}

function renderHealthReport(report = {}, { verbose = false } = {}) {
  const overallStatus = (report.status || 'info').toLowerCase();
  const statusBadge = formatStatusBadge(overallStatus, overallStatus.toUpperCase());
  console.log(sectionTitle(`🩺 RouterX Health — ${statusBadge}`));
  console.log(divider());

  (Array.isArray(report.checks) ? report.checks : []).forEach((check) => {
    const checkBadge = formatStatusBadge(check.status, check.status.toUpperCase());
    const latency = Number.isFinite(check.latencyMs) ? palette.muted(`(${check.latencyMs}ms)`) : '';
    console.log(`${checkBadge} ${check.name}${latency ? ` ${latency}` : ''}`);

    if (check.message) {
      console.log(`  ${check.message}`);
    }

    if (verbose && check.details) {
      Object.entries(check.details).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        console.log(palette.muted(`    ${key}: ${value}`));
      });
    }

    const suggestions = buildRecommendations(check);
    if (suggestions.length > 0) {
      suggestions.forEach((suggestion) => console.log(`  ➤ ${suggestion}`));
    }

    console.log('');
  });

  console.log(`Overall Status: ${statusBadge}`);
  console.log('');
  console.log(tipLine('Run `routerx doctor` for config and environment diagnostics'));
  console.log('');
}

function buildRecommendations(check) {
  if (check.status === healthCheckerStatus.HEALTHY) {
    return [];
  }

  if (check.name === 'Filesystem Readiness') {
    const path = check.details?.path;
    const errorMessage = (check.details?.error || '').toString();
    if (check.details?.missing || errorMessage.includes('ENOENT')) {
      return [
        `Missing directory: ${path}`,
        `Run "routerx init" or mkdir "${path}"`
      ];
    }
    return path ? [`Verify read/write permissions for ${path}`] : ['Verify output directory permissions'];
  }

  if (check.name === 'API Key') {
    return [
      'Set OPENAI_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY',
      'Run `routerx doctor` to re-check environment'
    ];
  }

  if (check.name === 'API Health') {
    const endpoint = check.details?.endpoint || check.details?.fallbackEndpoint || 'health endpoint';
    if (check.details?.statusCode === 401) {
      return ['API key rejected. Generate a new key and export it again.'];
    }
    return [
      `Endpoint unreachable: ${endpoint}`,
      'Check network connectivity or override --base-url'
    ];
  }

  return [];
}
