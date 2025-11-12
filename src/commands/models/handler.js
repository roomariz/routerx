import { ApiClient } from '../../infrastructure/api/index.js';
import { ConfigManager } from '../../infrastructure/config/index.js';
import { ERROR_MESSAGES, LOG_MESSAGES } from '../../shared/constants/index.js';
import { validateApiKey } from '../../shared/utils/auth.js';
import { handleError } from '../../shared/utils/error.js';
import { createResiliencePolicy, resolveResilienceOverridesFromOptions } from '../../resilience/index.js';
import { logger } from '../../monitoring/logger.js';

// Initialize configuration manager and load config
const configManager = new ConfigManager();
const config = configManager.loadConfig();

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
export async function handleModelsCommand(options) {
  // Validate API key exists (not strictly necessary for models but consistent)
  const apiKey = validateApiKey();

  const baseUrl = config.defaultBaseUrl; // Use base URL from config

  try {
    const resilienceOverrides = resolveResilienceOverridesFromOptions(options);
    if (Object.keys(resilienceOverrides).length > 0) {
      logger.info('Applying resilience overrides for models command', {
        overrides: resilienceOverrides
      });
    }

    const resiliencePolicy = createResiliencePolicy(config, resilienceOverrides);

    // Initialize API client with config for this request
    const apiClient = new ApiClient(config, { resiliencePolicy, logger });
    
    console.log(LOG_MESSAGES.FETCHING_MODELS);
    const res = await apiClient.fetchModels(baseUrl);
    const models = res.data.data || [];

    // Apply filters based on options using local utility
    const filtered = filterModels(models, options);

    // Handle case where no models match the filters
    if (filtered.length === 0) {
      console.log(ERROR_MESSAGES.NO_MODELS_FOUND);
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
    handleError(err, 'MODEL_FETCH_ERROR', { operation: 'handleModelsCommand', options });
  }
}