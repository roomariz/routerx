import chalk from 'chalk';
import { ERROR_MESSAGES } from '../constants/index.js';

/**
 * Handle errors consistently with uniform console output
 * @param {Error} err - The error to handle
 * @param {string} context - Context for the error (e.g., 'REQUEST_ERROR', 'MODEL_FETCH_ERROR')
 */
export function handleError(err, context = 'REQUEST_ERROR') {
  const message = ERROR_MESSAGES[context] || ERROR_MESSAGES.REQUEST_ERROR;
  console.error(message, err.message);
}

/**
 * Handle API errors consistently
 * @param {Error} error - The error to handle
 * @returns {Error} Formatted error
 */
export function handleAPIError(error) {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    return new Error(`API Error: ${status} - ${data.error?.message || 'Unknown error'}`);
  } else if (error.request) {
    // Request was made but no response received
    return new Error('Network Error: Request failed to reach the server');
  } else {
    // Something else happened
    return new Error(`Request Error: ${error.message}`);
  }
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