import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { HealthChecker, healthCheckerStatus } from '../../monitoring/health.js';
import { logger as baseLogger } from '../../monitoring/logger.js';
import { handleError } from '../../shared/utils/error.js';

const STATUS_ICONS = {
  healthy: '✅',
  degraded: '⚠️',
  unhealthy: '❌'
};

function parseTimeout(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatHealthReport(report) {
  const lines = [
    '🩺 RouterX Runtime & Dependency Health',
    `Timestamp: ${report.timestamp}`
  ];

  for (const check of report.checks) {
    const icon = STATUS_ICONS[check.status] || '❔';
    lines.push('');
    lines.push(`${icon} ${check.name} — ${check.status.toUpperCase()}`);

    if (typeof check.latencyMs === 'number') {
      lines.push(`   latency: ${check.latencyMs}ms`);
    }

    if (check.message) {
      lines.push(`   ${check.message}`);
    }

    const endpoint = check.details?.endpoint || check.details?.fallbackEndpoint;
    if (endpoint) {
      lines.push(`   endpoint: ${endpoint}`);
    }

    if (check.details?.statusCode) {
      lines.push(`   status: ${check.details.statusCode}`);
    }

    if (check.details?.error) {
      lines.push(`   error: ${check.details.error}`);
    }
  }

  lines.push('');
  lines.push(`Overall status: ${report.status.toUpperCase()}`);
  return lines.join('\n');
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
      console.log(formatHealthReport(report));
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
