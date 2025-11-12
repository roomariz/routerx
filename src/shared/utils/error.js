import chalk from 'chalk';
import { ERROR_MESSAGES } from '../constants/index.js';
import { APIError, RouterXError, ConfigError, FileError, ValidationError } from './routerxError.js';
import { metrics } from '../../monitoring/metrics.js';
import { successMetrics } from '../../monitoring/successMetrics.js';

/**
 * Handle errors consistently with uniform console output
 * @param {Error} err - The error to handle
 * @param {string} context - Context for the error (e.g., 'REQUEST_ERROR', 'MODEL_FETCH_ERROR')
 * @param {Object} additionalContext - Additional context for the error
 */
export function handleError(err, context = 'REQUEST_ERROR', additionalContext = {}) {
  const message = ERROR_MESSAGES[context] || ERROR_MESSAGES.REQUEST_ERROR;
  
  // If the error is already a RouterXError, enhance it with additional context
  if (err instanceof RouterXError) {
    err.context = { ...err.context, ...additionalContext };
    console.error(message, err.message);
    
    // Log structured error for monitoring systems
    console.error(JSON.stringify(err.toJSON()));
  } else {
    console.error(message, err.message);
  }

  metrics.incrementCounter('errors.handled_total', 1, {
    context,
    type: err?.code || err?.name || 'Error'
  });
  const incidentId = additionalContext?.incidentId || err?.context?.incidentId || err?.incidentId;
  successMetrics.recordErrorLogged({
    incidentId,
    code: err?.code || err?.name
  });
}

/**
 * Handle API errors consistently and return structured error
 * @param {Error} error - The error to handle
 * @param {Object} context - Additional context for the error
 * @returns {RouterXError} Formatted error
 */
export function handleAPIError(error, context = {}) {
  const incidentId = error?.incidentId || context?.incidentId;
  const contextWithIncident = incidentId ? { ...context, incidentId } : context;
  let apiError;

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    apiError = new APIError(
      `API Error: ${status} - ${data.error?.message || 'Unknown error'}`,
      `API_ERROR_${status}`,
      { ...contextWithIncident, status, response: data }
    );
  } else if (error.request) {
    // Request was made but no response received
    apiError = new APIError(
      'Network Error: Request failed to reach the server',
      'NETWORK_ERROR',
      { ...contextWithIncident, request: error.request }
    );
  } else {
    // Something else happened
    apiError = new APIError(
      `Request Error: ${error.message}`,
      'REQUEST_ERROR',
      { ...contextWithIncident, originalMessage: error.message }
    );
  }
  
  metrics.incrementCounter('errors.api_total', 1, {
    status: apiError?.context?.status,
    context: context.operation || context.command || 'api',
    category: apiError?.context?.type || 'api'
  });

  return apiError;
}

/**
 * Exit the process with an error message
 * @param {string} message - The error message to display
 * @param {number} code - Exit code (default: 1)
 */
export function exitWithError(message, code = 1) {
  console.error(message);
  process.exit(code);
}

/**
 * Create and throw a structured RouterXError
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {Object} context - Additional context for the error
 * @param {string} type - Type of error (api, config, file, validation)
 */
export function createRouterXError(message, code, context = {}, type = 'generic') {
  switch (type) {
    case 'api':
      return new APIError(message, code, context);
    case 'config':
      return new ConfigError(message, code, context);
    case 'file':
      return new FileError(message, code, context);
    case 'validation':
      return new ValidationError(message, code, context);
    default:
      return new RouterXError(message, code, context);
  }
}
