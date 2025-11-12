// src/core/bootstrap.js
// RouterX application bootstrap - global error handling and initialization

import { RouterXError } from '../shared/utils/routerxError.js';
import { createRouterXError } from '../shared/utils/error.js';
import envLoader from '../infrastructure/env/envLoader.js';

/**
 * Set up global error handlers for the application
 */
function setupGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);

    // Create a structured error object for the unhandled rejection
    const error = createRouterXError(
      `Unhandled Rejection: ${reason?.message || reason || 'Unknown reason'}`,
      'UNHANDLED_REJECTION',
      {
        reason: reason?.message || reason?.toString?.() || 'Unknown reason',
        stack: reason?.stack,
        timestamp: new Date().toISOString()
      }
    );

    // Log structured error for monitoring systems
    console.error('Structured Error:', JSON.stringify(error.toJSON()));

    // Exit the process after logging the error
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);

    // Create a structured error object for the uncaught exception
    const error = createRouterXError(
      `Uncaught Exception: ${err.message}`,
      'UNCAUGHT_EXCEPTION',
      {
        originalMessage: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      }
    );

    // Log structured error for monitoring systems
    console.error('Structured Error:', JSON.stringify(error.toJSON()));

    // Exit the process after logging the error
    // Note: In some cases, it might be better to let the process continue
    // depending on the severity of the error
    process.exit(1);
  });

  // Handle process termination signals gracefully
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  // Handle uncaught exceptions in child processes if any
  process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.error('Uncaught Exception Monitor:', err, 'Origin:', origin);

    const error = createRouterXError(
      `Uncaught Exception Monitor: ${err.message}`,
      'UNCAUGHT_EXCEPTION_MONITOR',
      {
        originalMessage: err.message,
        stack: err.stack,
        origin,
        timestamp: new Date().toISOString()
      }
    );

    // Log structured error for monitoring systems
    console.error('Structured Error:', JSON.stringify(error.toJSON()));
  });
}

/**
 * Bootstrap the RouterX application
 * @param {Object} options - Bootstrap options
 * @param {boolean} [options.enableGlobalHandlers=true] - Whether to enable global error handlers
 * @returns {Object} Bootstrap result with status and any errors
 */
export function bootstrap(options = {}) {
  const { enableGlobalHandlers = true } = options;

  try {
    // Load environment variables from .env file
    envLoader.loadEnvFile();

    if (enableGlobalHandlers) {
      setupGlobalErrorHandlers();
    }

    // Additional bootstrap operations can be added here
    // For example: logging setup, configuration validation, etc.

    return {
      success: true,
      timestamp: new Date().toISOString(),
      message: 'RouterX application bootstrapped successfully'
    };
  } catch (error) {
    const routerXError = createRouterXError(
      `Bootstrap error: ${error.message}`,
      'BOOTSTRAP_ERROR',
      {
        originalMessage: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    );

    console.error('Bootstrap Error:', JSON.stringify(routerXError.toJSON()));
    
    return {
      success: false,
      error: routerXError,
      timestamp: new Date().toISOString(),
      message: 'RouterX application bootstrap failed'
    };
  }
}