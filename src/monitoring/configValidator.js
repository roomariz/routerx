// src/monitoring/configValidator.js
import { createRouterXError } from '../shared/utils/error.js';

const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
const isNonNegativeNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;

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

    if (!config.resilience || typeof config.resilience !== 'object') {
      errors.push('resilience must be a configuration object');
    } else {
      const resilience = config.resilience;

      if (!isPositiveNumber(resilience.timeoutMs)) {
        errors.push('resilience.timeoutMs must be a positive number');
      }

      if (!isNonNegativeInteger(resilience.maxRetries)) {
        errors.push('resilience.maxRetries must be a non-negative integer');
      }

      if (!isPositiveNumber(resilience.baseDelayMs)) {
        errors.push('resilience.baseDelayMs must be a positive number');
      }

      if (!isPositiveNumber(resilience.maxDelayMs)) {
        errors.push('resilience.maxDelayMs must be a positive number');
      }

      if (isPositiveNumber(resilience.baseDelayMs) && isPositiveNumber(resilience.maxDelayMs)) {
        if (resilience.maxDelayMs < resilience.baseDelayMs) {
          errors.push('resilience.maxDelayMs must be greater than or equal to resilience.baseDelayMs');
        }
      }

      if (!isNonNegativeNumber(resilience.jitterMs)) {
        errors.push('resilience.jitterMs must be a non-negative number');
      }

      if (!isPositiveInteger(resilience.breakerThreshold)) {
        errors.push('resilience.breakerThreshold must be a positive integer');
      }

      if (!isPositiveNumber(resilience.breakerCooldownMs)) {
        errors.push('resilience.breakerCooldownMs must be a positive number');
      }

      if (!isPositiveInteger(resilience.breakerHalfOpenSuccesses)) {
        errors.push('resilience.breakerHalfOpenSuccesses must be a positive integer');
      }

      if (!isPositiveInteger(resilience.breakerHalfOpenFailures)) {
        errors.push('resilience.breakerHalfOpenFailures must be a positive integer');
      }
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