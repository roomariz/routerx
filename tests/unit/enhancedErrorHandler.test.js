// tests/unit/enhancedErrorHandler.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import chalk from 'chalk';
import { ERROR_MESSAGES } from '../../src/shared/constants/index.js';
import { handleError, handleAPIError, exitWithError, createRouterXError } from '../../src/shared/utils/error.js';
import { RouterXError, APIError, ConfigError, FileError, ValidationError } from '../../src/shared/utils/routerxError.js';

describe('Enhanced ErrorHandler', () => {
  // Save original console methods and process.exit
  const originalConsole = { ...console };
  const originalExit = process.exit;

  beforeEach(() => {
    // Mock console.error to capture output
    console.error = jest.fn();
    // Mock process.exit to avoid actually exiting
    process.exit = jest.fn();
  });

  afterEach(() => {
    // Restore original console methods and process.exit
    console.error = originalConsole.error;
    process.exit = originalExit;
    jest.clearAllMocks();
  });

  describe('handleError with structured error support', () => {
    test('handles structured RouterXError with additional context', () => {
      const mockError = new RouterXError('Test error message', 'TEST_ERROR', { test: 'value' });
      
      handleError(mockError, 'REQUEST_ERROR', { additional: 'context' });

      expect(console.error).toHaveBeenCalledWith(
        ERROR_MESSAGES.REQUEST_ERROR,
        'Test error message'
      );
      // Check that JSON string was also called for structured logging
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(mockError.toJSON()))
      );
    });
  });

  describe('handleAPIError with enhanced context', () => {
    test('formats API error with status and message when response exists', () => {
      const error = {
        response: {
          status: 401,
          data: {
            error: { message: 'Unauthorized access' }
          }
        }
      };

      const result = handleAPIError(error);

      expect(result).toBeInstanceOf(APIError);
      expect(result.message).toBe('API Error: 401 - Unauthorized access');
      expect(result.code).toBe('API_ERROR_401');
    });

    test('formats API error with context', () => {
      const error = {
        response: {
          status: 404,
          data: { error: { message: 'Not found' } }
        }
      };

      const result = handleAPIError(error, { operation: 'testOp', userId: '123' });

      expect(result).toBeInstanceOf(APIError);
      expect(result.context).toEqual({
        operation: 'testOp',
        userId: '123',
        type: 'api',
        status: 404,
        response: { error: { message: 'Not found' } }
      });
    });
  });

  describe('createRouterXError', () => {
    test('creates a generic RouterXError', () => {
      const error = createRouterXError('Test message', 'TEST_CODE', { test: 'value' });

      expect(error).toBeInstanceOf(RouterXError);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ test: 'value' });
    });

    test('creates an APIError', () => {
      const error = createRouterXError('API test message', 'API_TEST_CODE', { test: 'value' }, 'api');

      expect(error).toBeInstanceOf(APIError);
      expect(error.message).toBe('API test message');
      expect(error.code).toBe('API_TEST_CODE');
      expect(error.context).toEqual({ test: 'value', type: 'api' });
    });

    test('creates a ConfigError', () => {
      const error = createRouterXError('Config test message', 'CONFIG_TEST_CODE', { test: 'value' }, 'config');

      expect(error).toBeInstanceOf(ConfigError);
      expect(error.message).toBe('Config test message');
      expect(error.code).toBe('CONFIG_TEST_CODE');
      expect(error.context).toEqual({ test: 'value', type: 'config' });
    });

    test('creates a FileError', () => {
      const error = createRouterXError('File test message', 'FILE_TEST_CODE', { test: 'value' }, 'file');

      expect(error).toBeInstanceOf(FileError);
      expect(error.message).toBe('File test message');
      expect(error.code).toBe('FILE_TEST_CODE');
      expect(error.context).toEqual({ test: 'value', type: 'file' });
    });

    test('creates a ValidationError', () => {
      const error = createRouterXError('Validation test message', 'VALIDATION_TEST_CODE', { test: 'value' }, 'validation');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation test message');
      expect(error.code).toBe('VALIDATION_TEST_CODE');
      expect(error.context).toEqual({ test: 'value', type: 'validation' });
    });
  });

  describe('RouterXError Class', () => {
    test('creates error with proper properties', () => {
      const error = new RouterXError('Test message', 'TEST_CODE', { additional: 'data' });

      expect(error).toBeInstanceOf(RouterXError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.context).toEqual({ additional: 'data' });
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('RouterXError');
    });

    test('serializes to JSON correctly', () => {
      const error = new RouterXError('Test message', 'TEST_CODE', { additional: 'data' });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'RouterXError',
        message: 'Test message',
        code: 'TEST_CODE',
        timestamp: error.timestamp,
        context: { additional: 'data' },
        stack: expect.any(String)
      });
    });
  });

  describe('APIError Class', () => {
    test('creates API error with proper properties', () => {
      const error = new APIError('API error message', 'API_CODE', { apiSpecific: 'data' });

      expect(error).toBeInstanceOf(APIError);
      expect(error).toBeInstanceOf(RouterXError);
      expect(error.message).toBe('API error message');
      expect(error.code).toBe('API_CODE');
      expect(error.context).toEqual({ apiSpecific: 'data', type: 'api' });
      expect(error.name).toBe('APIError');
    });
  });

  describe('ConfigError Class', () => {
    test('creates config error with proper properties', () => {
      const error = new ConfigError('Config error message', 'CONFIG_CODE', { configSpecific: 'data' });

      expect(error).toBeInstanceOf(ConfigError);
      expect(error).toBeInstanceOf(RouterXError);
      expect(error.message).toBe('Config error message');
      expect(error.code).toBe('CONFIG_CODE');
      expect(error.context).toEqual({ configSpecific: 'data', type: 'config' });
      expect(error.name).toBe('ConfigError');
    });
  });
});