import fs from 'fs';
import path from 'path';
import os from 'os';
import { HealthChecker, healthCheckerStatus } from '../../monitoring/health.js';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { logger as baseLogger } from '../../monitoring/logger.js';
import { handleError } from '../../shared/utils/error.js';
import { sectionTitle, divider, tipLine } from '../../cli/ui/layout.js';
import { formatStatusBadge, palette } from '../../cli/ui/theme.js';
import { validateApiKey } from '../../shared/utils/auth.js';

/**
 * Run comprehensive diagnostics (health + config + environment).
 * @param {Object} options
 */
export async function handleDoctorCommand(options = {}, context = {}) {
  const config = getRuntimeConfig();
  const { logger: commandLogger = baseLogger, traceId } = context;

  try {
    const healthChecker = new HealthChecker(config, {
      logger: commandLogger.child({ component: 'HealthChecker', traceId })
    });

    const report = await healthChecker.fullHealthCheck({
      baseUrl: options.baseUrl,
      endpoint: options.endpoint
    });

    const configInsights = evaluateConfig(config);
    const envInsights = evaluateEnvironment();

    const overallStatus = computeOverallStatus([
      report.status,
      configInsights.status,
      envInsights.status
    ]);

    if (options.json) {
      console.log(JSON.stringify({
        status: overallStatus,
        health: report,
        config: configInsights,
        environment: envInsights
      }, null, 2));
    } else {
      renderDoctorReport({
        healthReport: report,
        configInsights,
        envInsights,
        overallStatus
      });
    }

    if (overallStatus !== 'healthy') {
      process.exitCode = 1;
    }

    commandLogger.info('Doctor diagnostics completed', {
      status: overallStatus,
      traceId
    });

    return {
      status: overallStatus,
      health: report,
      config: configInsights,
      environment: envInsights
    };
  } catch (error) {
    commandLogger.error('Doctor command failed', { error, traceId });
    handleError(error, 'DOCTOR_COMMAND_FAILED', {
      operation: 'handleDoctorCommand',
      options,
      traceId
    });
    process.exitCode = 1;
    return null;
  }
}

function evaluateConfig(config) {
  const entries = [];
  const outputPath = path.resolve(config.defaultSavePath || './outputs');

  entries.push(createInsight('Default Model', 'healthy', config.defaultModel || 'not set'));
  entries.push(createInsight('Base URL', 'healthy', config.defaultBaseUrl || 'not set'));

  if (fs.existsSync(outputPath)) {
    entries.push(createInsight('Output Directory', 'healthy', outputPath));
  } else {
    entries.push(createInsight('Output Directory', 'unhealthy', `Missing ${outputPath}`, [
      `Run "routerx init" to create ${outputPath}`
    ]));
  }

  return summarizeEntries(entries);
}

function evaluateEnvironment() {
  const entries = [];
  const apiKey = validateApiKey();

  if (apiKey) {
    entries.push(createInsight('API Key', 'healthy', 'Detected'));
  } else {
    entries.push(createInsight('API Key', 'unhealthy', 'Missing', [
      'Set OPENAI_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY'
    ]));
  }

  entries.push(createInsight('Node.js', 'healthy', process.version));
  entries.push(createInsight('Platform', 'healthy', `${process.platform} ${os.release()}`));
  entries.push(createInsight('Working Directory', 'healthy', process.cwd()));

  return summarizeEntries(entries);
}

function summarizeEntries(entries) {
  const hasFailure = entries.some((entry) => entry.status === 'unhealthy');
  const hasWarning = entries.some((entry) => entry.status === 'warning');
  return {
    status: hasFailure ? 'unhealthy' : (hasWarning ? 'warning' : 'healthy'),
    entries
  };
}

function createInsight(label, status, detail, suggestions = []) {
  return { label, status, detail, suggestions };
}

function computeOverallStatus(statuses = []) {
  const normalized = statuses.map((status) => (status || '').toLowerCase());
  if (normalized.some((status) => status === healthCheckerStatus.UNHEALTHY || status === 'unhealthy')) {
    return 'unhealthy';
  }

  if (normalized.some((status) => status === healthCheckerStatus.DEGRADED || status === 'warning')) {
    return 'warning';
  }

  return 'healthy';
}

function renderDoctorReport({ healthReport, configInsights, envInsights, overallStatus }) {
  const badge = formatStatusBadge(overallStatus, overallStatus.toUpperCase());
  console.log(sectionTitle(`🩺 RouterX Doctor — ${badge}`));
  console.log(divider());

  renderHealthSection(healthReport);
  renderInsightsSection('Configuration', configInsights);
  renderInsightsSection('Environment', envInsights);

  console.log(tipLine('Use `routerx init` to provision folders or rerun `routerx doctor` after fixes'));
  console.log('');
}

function renderHealthSection(report) {
  console.log(palette.accent('Health Checks'));
  (report.checks || []).forEach((check) => {
    const checkStatus = (check.status || 'info').toLowerCase();
    const badge = formatStatusBadge(checkStatus, checkStatus.toUpperCase());
    const latency = Number.isFinite(check.latencyMs) ? palette.muted(`(${check.latencyMs}ms)`) : '';
    console.log(`  ${badge} ${check.name}${latency ? ` ${latency}` : ''}`);
    if (check.message) {
      console.log(`    ${check.message}`);
    }
  });
  console.log('');
}

function renderInsightsSection(title, summary) {
  console.log(palette.accent(title));
  summary.entries.forEach((entry) => {
    const badge = formatStatusBadge(entry.status, entry.status.toUpperCase());
    console.log(`  ${badge} ${entry.label} — ${entry.detail}`);
    entry.suggestions?.forEach((suggestion) => {
      console.log(`    ➤ ${suggestion}`);
    });
  });
  console.log('');
}
