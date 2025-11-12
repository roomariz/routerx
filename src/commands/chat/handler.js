import chalk from 'chalk';
import { ApiClient } from '../../infrastructure/api/index.js';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { ERROR_MESSAGES, LOG_MESSAGES } from '../../shared/constants/index.js';
import { formatTimestamp } from '../../shared/utils/file.js';
import { validateApiKey } from '../../shared/utils/auth.js';
import { handleStream } from '../../shared/utils/stream.js';
import { handleError } from '../../shared/utils/error.js';
import { createResiliencePolicy, resolveResilienceOverridesFromOptions } from '../../resilience/index.js';
import { logger as baseLogger } from '../../monitoring/logger.js';

/**
 * Handle the chat command action
 * @param {string} prompt - The prompt to send to the model
 * @param {Object} options - Command options
 * @param {string} [options.model] - Model name to use
 * @param {string} [options.baseUrl] - API base URL to use
 * @param {string} [options.save] - File path to save the response
 */
export async function handleChatCommand(prompt, options, context = {}) {
  const config = getRuntimeConfig();
  const { logger: commandLogger = baseLogger, traceId } = context;

  // Validate API key exists
  const apiKey = validateApiKey();
  if (!apiKey) {
    console.error(ERROR_MESSAGES.MISSING_API_KEY);
    process.exit(1);
  }

  const resilienceOverrides = resolveResilienceOverridesFromOptions(options);
  if (Object.keys(resilienceOverrides).length > 0) {
    commandLogger.info('Applying resilience overrides for chat command', {
      overrides: resilienceOverrides,
      traceId
    });
  }

  const resiliencePolicy = createResiliencePolicy(config, resilienceOverrides);
  const apiClientLogger = commandLogger.child({ component: 'ApiClient' });
  const apiClient = new ApiClient(config, { resiliencePolicy, logger: apiClientLogger });

  // Set default values for model and base URL from config
  const model = options.model || config.defaultModel;
  const baseUrl = options.baseUrl || config.defaultBaseUrl;

  // Log the request details
  console.log(`${chalk.dim(formatTimestamp())} ${LOG_MESSAGES.SENDING_TO_MODEL}${chalk.yellow(model)}`);
  console.log(`${chalk.dim(formatTimestamp())} ${chalk.dim(LOG_MESSAGES.API_BASE_URL)}${baseUrl}`);
  console.log(`${chalk.dim(formatTimestamp())} ${LOG_MESSAGES.PROMPT_INFO}"${prompt}"`);
  console.log(`${chalk.dim(formatTimestamp())} ${LOG_MESSAGES.REPLY_STREAMING}`);

  try {
    // Make the API request with streaming response
    const response = await apiClient.makeChatCompletion(apiKey, model, prompt, baseUrl);

    // Handle the stream response using the dedicated utility
    await handleStream(response, { save: options.save, prompt });
    commandLogger.info('Chat stream completed', { model, baseUrl, traceId });
  } catch (err) {
    commandLogger.error('Chat command failed', {
      error: err,
      model,
      baseUrl,
      traceId
    });

    // Handle any errors from the API request using the error handler
    handleError(err, 'REQUEST_ERROR', {
      operation: 'handleChatCommand',
      model,
      baseUrl,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      traceId
    });
  }
}
