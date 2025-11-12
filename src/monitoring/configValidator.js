// src/monitoring/configValidator.js
import { createRouterXError } from '../shared/utils/error.js';

export class ConfigValidator {
  static validate(config) {
    const errors = [];

    if (typeof config.defaultModel !== 'string' || !config.defaultModel.trim()) {
      errors.push('defaultModel must be a non-empty string');
    }

    if (typeof config.defaultBaseUrl !== 'string' || !this.isValidUrl(config.defaultBaseUrl)) {
      errors.push('defaultBaseUrl must be a valid URL');
    }

    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      errors.push('timeout must be a positive number');
    }

    if (typeof config.maxRetries !== 'number' || config.maxRetries < 0) {
      errors.push('maxRetries must be a non-negative number');
    }

    if (errors.length > 0) {
      const error = createRouterXError(
        `Configuration validation failed: ${errors.join(', ')}`,
        'CONFIG_VALIDATION_ERROR',
        { errors, config }
      );
      throw error;
    }

    return true;
  }

  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}