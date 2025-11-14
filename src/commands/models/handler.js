import chalk from 'chalk';
import { ApiClient } from '../../infrastructure/api/index.js';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { ERROR_MESSAGES } from '../../shared/constants/index.js';
import { validateApiKey } from '../../shared/utils/auth.js';
import { handleError } from '../../shared/utils/error.js';
import { createResiliencePolicy, resolveResilienceOverridesFromOptions } from '../../resilience/index.js';
import { logger as baseLogger } from '../../monitoring/logger.js';
import { readJsonCache, writeJsonCache } from '../../shared/utils/cache.js';
import { sectionTitle, divider, tipLine } from '../../cli/ui/layout.js';
import { palette } from '../../cli/ui/theme.js';
import { renderTable } from '../../cli/ui/table.js';

const MODEL_CACHE_KEY = 'routerx-model-catalog';
const MODEL_CACHE_TTL_MS = 1000 * 60 * 5;
const DEFAULT_LIMIT = 50;

/**
 * Filter models based on command options
 * @param {Array} models - Array of model objects from API
 * @param {Object} options - Command options
 * @param {boolean} [options.free] - Whether to show only free models
 * @param {string} [options.search] - Keyword to search for in model names
 * @param {string} [options.vendor] - Filter by organization prefix
 * @returns {Array} Filtered array of models
 */
export function filterModels(models, options) {
  let filtered = models.filter((m) => m?.id);

  if (options.free) {
    filtered = filtered.filter((m) => isFreeModel(m));
  }

  if (options.vendor) {
    const vendor = options.vendor.toString().toLowerCase().trim();
    filtered = filtered.filter((m) => getVendor(m.id) === vendor);
  }

  if (options.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter((m) => m.id.toLowerCase().includes(q));
  }

  return filtered;
}

/**
 * Handle the models command action
 * @param {Object} options - Command options
 */
export async function handleModelsCommand(options, context = {}) {
  const config = getRuntimeConfig();
  const { logger: commandLogger = baseLogger, traceId } = context;

  // Validate API key exists (not strictly necessary for models but consistent)
  validateApiKey();

  const baseUrl = config.defaultBaseUrl;

  try {
    const resilienceOverrides = resolveResilienceOverridesFromOptions(options);
    if (Object.keys(resilienceOverrides).length > 0) {
      commandLogger.info('Applying resilience overrides for models command', {
        overrides: resilienceOverrides,
        traceId
      });
    }

    const resiliencePolicy = createResiliencePolicy(config, resilienceOverrides);
    const apiClientLogger = commandLogger.child({ component: 'ApiClient' });
    const apiClient = new ApiClient(config, { resiliencePolicy, logger: apiClientLogger });

    const cacheEntry = readJsonCache(MODEL_CACHE_KEY, MODEL_CACHE_TTL_MS);
    let models = cacheEntry?.data?.models || [];
    let fromCache = false;
    let cacheAgeMs = null;

    if (models.length > 0) {
      fromCache = true;
      cacheAgeMs = Date.now() - (cacheEntry?.data?.fetchedAt ? Date.parse(cacheEntry.data.fetchedAt) : cacheEntry?.savedAt || Date.now());
      commandLogger.debug('Using cached model catalog', {
        totalModels: models.length,
        ageMs: cacheAgeMs,
        traceId
      });
    } else {
      commandLogger.info('Fetching models from API', { baseUrl, traceId });
      const res = await apiClient.fetchModels(baseUrl);
      models = res?.data?.data || [];
      writeJsonCache(MODEL_CACHE_KEY, {
        fetchedAt: new Date().toISOString(),
        models
      });
      commandLogger.debug('Models fetched and cached', { totalModels: models.length, traceId });
    }

    const filtered = filterModels(models, options);
    const limit = normalizeLimit(options.limit);
    const limitedResults = limit ? filtered.slice(0, limit) : filtered;

    commandLogger.info('Models filtered', {
      totalModels: models.length,
      filteredModels: filtered.length,
      limitApplied: limit,
      filters: options,
      traceId
    });

    if (filtered.length === 0) {
      renderEmptyState(options);
      commandLogger.warn('No models matched filters', { filters: options, traceId });
      return;
    }

    if (options.json) {
      console.log(JSON.stringify({
        count: filtered.length,
        limit,
        results: limitedResults
      }, null, 2));
      return;
    }

    renderModelsTableSection(limitedResults, {
      total: filtered.length,
      limit,
      options,
      fromCache,
      cacheAgeMs
    });
  } catch (err) {
    commandLogger.error('Models command failed', { error: err, traceId });
    handleError(err, 'MODEL_FETCH_ERROR', {
      operation: 'handleModelsCommand',
      options,
      traceId
    });
  }
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(parsed), 200);
}

function isFreeModel(model) {
  return /(:free|-free|\/free)/i.test(model.id) ||
    model.pricing?.prompt === 0 ||
    model.pricing?.completion === 0;
}

function getVendor(modelId = '') {
  const [vendor] = modelId.split('/');
  return (vendor || '').toLowerCase();
}

function formatRelativeAge(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs <= 0) {
    return 'just now';
  }

  const seconds = Math.round(ageMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatAccessBadge(model) {
  return isFreeModel(model)
    ? chalk.green('🟢 Free')
    : chalk.yellow('🟡 Paid');
}

function formatStatus(model) {
  const status = (model.status || 'Available').toLowerCase();
  if (status.includes('deprecated') || status.includes('limited')) {
    return chalk.yellow(status.replace(/\b\w/g, (l) => l.toUpperCase()));
  }

  if (status.includes('offline') || status.includes('error')) {
    return chalk.red(status.replace(/\b\w/g, (l) => l.toUpperCase()));
  }

  return chalk.green('Available');
}

function buildScopeSuffix(options) {
  const parts = [];
  if (options.free) {
    parts.push('Free');
  }
  if (options.vendor) {
    parts.push(`Vendor: ${options.vendor}`);
  }
  if (options.search) {
    parts.push(`Search: "${options.search}"`);
  }

  return parts.length > 0 ? ` (${parts.join(' · ')})` : '';
}

function renderModelsTableString(models) {
  const columns = [
    { header: chalk.bold('Model'), align: 'left' },
    { header: chalk.bold('Access'), align: 'center' },
    { header: chalk.bold('Status'), align: 'left' }
  ];

  const rows = models.map((model) => [
    chalk.white(model.id),
    formatAccessBadge(model),
    formatStatus(model)
  ]);

  return renderTable(columns, rows);
}

function renderModelsTableSection(models, meta) {
  const scopeSuffix = buildScopeSuffix(meta.options);
  const summaryTitle = `🧠 RouterX Models${scopeSuffix} — ${meta.total} results`;

  console.log(sectionTitle(summaryTitle));
  console.log(divider());
  console.log(renderModelsTableString(models));
  console.log('');

  if (meta.total > models.length) {
    console.log(palette.muted(`Showing ${models.length} of ${meta.total}. Use --limit to adjust.`));
  }

  const source = meta.fromCache
    ? `Cached ${formatRelativeAge(meta.cacheAgeMs)}`
    : 'Fetched live';

  console.log(palette.muted(`Source: ${source}`));
  console.log('');
  console.log(tipLine('Use --search openai or --json for detailed output'));
  console.log('');
}

function renderEmptyState(options) {
  const scopeSuffix = buildScopeSuffix(options);
  const title = `🧠 RouterX Models${scopeSuffix}`;
  console.log(sectionTitle(title));
  console.log(divider());
  console.log(chalk.yellow(ERROR_MESSAGES.NO_MODELS_FOUND));
  console.log('');
  console.log(tipLine('Relax filters or try --search <keyword>.'));
  console.log('');
}
