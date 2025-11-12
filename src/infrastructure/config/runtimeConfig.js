// src/infrastructure/config/runtimeConfig.js
// Provides a cached view of the loaded configuration so it can be shared across the CLI

import ConfigManager from './index.js';

const configManager = new ConfigManager();
let runtimeConfig = null;

/**
 * Load configuration from disk and cache it for future access.
 * @returns {Object} Loaded configuration object.
 */
export function loadRuntimeConfig() {
  runtimeConfig = configManager.loadConfig();
  return runtimeConfig;
}

/**
 * Get the cached configuration, loading it if necessary.
 * @returns {Object} Configuration object.
 */
export function getRuntimeConfig() {
  if (runtimeConfig) {
    return runtimeConfig;
  }
  return loadRuntimeConfig();
}

/**
 * Reset the cached configuration. Intended for testing.
 */
export function resetRuntimeConfig() {
  runtimeConfig = null;
}
