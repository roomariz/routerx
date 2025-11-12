/**
 * Enhanced error class for RouterX with additional metadata
 */
class RouterXError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error to JSON for structured logging
   * @returns {Object} Serialized error object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Specific error class for API-related issues
 */
class APIError extends RouterXError {
  constructor(message, code, context = {}) {
    super(message, code, { ...context, type: 'api' });
    this.name = 'APIError';
  }
}

/**
 * Specific error class for configuration issues
 */
class ConfigError extends RouterXError {
  constructor(message, code, context = {}) {
    super(message, code, { ...context, type: 'config' });
    this.name = 'ConfigError';
  }
}

/**
 * Specific error class for file system issues
 */
class FileError extends RouterXError {
  constructor(message, code, context = {}) {
    super(message, code, { ...context, type: 'file' });
    this.name = 'FileError';
  }
}

/**
 * Specific error class for validation issues
 */
class ValidationError extends RouterXError {
  constructor(message, code, context = {}) {
    super(message, code, { ...context, type: 'validation' });
    this.name = 'ValidationError';
  }
}

export {
  RouterXError,
  APIError,
  ConfigError,
  FileError,
  ValidationError
};