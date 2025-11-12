import { ApiClient } from '../../infrastructure/api/index.js';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { ERROR_MESSAGES, LOG_MESSAGES } from '../../shared/constants/index.js';
import { validateApiKey } from '../../shared/utils/auth.js';
import { handleError } from '../../shared/utils/error.js';
import { createResiliencePolicy, resolveResilienceOverridesFromOptions } from '../../resilience/index.js';
import { logger as baseLogger } from '../../monitoring/logger.js';

/**
 * Filter models based on command options
 * @param {Array} models - Array of model objects from API
 * @param {Object} options - Command options
 * @param {boolean} [options.free] - Whether to show only free models
 * @param {string} [options.search] - Keyword to search for in model names
 * @returns {Array} Filtered array of models
 */
export function filterModels(models, options) {
  let filtered = models.filter((m) => m.id);

  // Filter by free models if requested
  if (options.free) {
    filtered = filtered.filter(
      (m) =>
        /(:free|-free|\/free)/i.test(m.id) ||  // Check for free suffix/prefix
        m.pricing?.prompt === 0 ||             // Check for free pricing
        m.pricing?.completion === 0
    );
  }

  // Filter by search keyword if provided
  if (options.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter((m) => m.id.toLowerCase().includes(q));
  }

  return filtered;
}

/**
 * Handle the models command action
 * @param {Object} options - Command options
 * @param {boolean} [options.free] - Whether to show only free models
 * @param {string} [options.search] - Keyword to search for in model names
 */
export async function handleModelsCommand(options, context = {}) {
  const config = getRuntimeConfig();
  const { logger: commandLogger = baseLogger, traceId } = context;

  // Validate API key exists (not strictly necessary for models but consistent)
  const apiKey = validateApiKey();

  const baseUrl = config.defaultBaseUrl; // Use base URL from config

  try {
    const resilienceOverrides = resolveResilienceOverridesFromOptions(options);
    if (Object.keys(resilienceOverrides).length > 0) {
      commandLogger.info('Applying resilience overrides for models command', {
        overrides: resilienceOverrides,
        traceId
      });
    }

    const resiliencePolicy = createResiliencePolicy(config, resilienceOverrides);

    // Initialize API client with config for this request
    const apiClientLogger = commandLogger.child({ component: 'ApiClient' });
    const apiClient = new ApiClient(config, { resiliencePolicy, logger: apiClientLogger });

    commandLogger.info('Fetching models from API', { baseUrl, traceId });
    
    console.log(LOG_MESSAGES.FETCHING_MODELS);
    const res = await apiClient.fetchModels(baseUrl);
    const models = res.data.data || [];
    commandLogger.debug('Models fetched', { totalModels: models.length, traceId });

    // Apply filters based on options using local utility
    const filtered = filterModels(models, options);
    commandLogger.info('Models filtered', {
      totalModels: models.length,
      filteredModels: filtered.length,
      filters: options,
      traceId
    });

    // Handle case where no models match the filters
    if (filtered.length === 0) {
      console.log(ERROR_MESSAGES.NO_MODELS_FOUND);
      commandLogger.warn('No models matched filters', { filters: options, traceId });
      return;
    }

    // Display the available models
    console.log(
      `\n${LOG_MESSAGES.AVAILABLE_MODELS}${options.free ? ' Free' : ''}${options.search ? ` matching '${options.search}'` : ''}:\n`
    );
    for (const model of filtered) {
      // Determine if the model is free or paid
      const status =
        /(:free|-free|\/free)/i.test(model.id) ||
          model.pricing?.prompt === 0 ||
          model.pricing?.completion === 0
          ? 'Free'
          : 'Paid';
      console.log(`• ${model.id.padEnd(45)} | ${status}`);
    }
  } catch (err) {
    commandLogger.error('Models command failed', { error: err, traceId });
    handleError(err, 'MODEL_FETCH_ERROR', {
      operation: 'handleModelsCommand',
      options,
      traceId
    });
  }
}
