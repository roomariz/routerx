// tests/unit/errorHandler.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import chalk from 'chalk';
import { ERROR_MESSAGES } from '../../src/shared/constants/index.js';
import { handleError, handleAPIError, exitWithError } from '../../src/shared/utils/error.js';

describe('ErrorHandler', () => {
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

  describe('handleError', () => {
    test('logs error with default context message when context is not provided', () => {
      const mockError = new Error('Test error message');
      
      handleError(mockError);
      
      expect(console.error).toHaveBeenCalledWith(
        ERROR_MESSAGES.REQUEST_ERROR,
        'Test error message'
      );
    });

    test('logs error with specific context message when context is provided', () => {
      const mockError = new Error('Test error message');
      
      handleError(mockError, 'MODEL_FETCH_ERROR');
      
      expect(console.error).toHaveBeenCalledWith(
        ERROR_MESSAGES.MODEL_FETCH_ERROR,
        'Test error message'
      );
    });

    test('logs error with fallback message when context is not found', () => {
      const mockError = new Error('Test error message');
      
      handleError(mockError, 'UNKNOWN_CONTEXT');
      
      expect(console.error).toHaveBeenCalledWith(
        ERROR_MESSAGES.REQUEST_ERROR,
        'Test error message'
      );
    });

    test('handles error with no message property', () => {
      const mockError = { someProp: 'value' };
      
      handleError(mockError);
      
      expect(console.error).toHaveBeenCalledWith(
        ERROR_MESSAGES.REQUEST_ERROR,
        undefined
      );
    });
  });

  describe('handleAPIError', () => {
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

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('API Error: 401 - Unauthorized access');
    });

    test('formats API error with unknown message when no error message provided', () => {
      const error = {
        response: {
          status: 500,
          data: {}
        }
      };

      const result = handleAPIError(error);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('API Error: 500 - Unknown error');
    });

    test('formats network error when request exists but no response', () => {
      const error = {
        request: {}
      };

      const result = handleAPIError(error);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Network Error: Request failed to reach the server');
    });

    test('formats generic request error when other error occurs', () => {
      const error = new Error('Something went wrong');

      const result = handleAPIError(error);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Request Error: Something went wrong');
    });
  });

  describe('exitWithError', () => {
    test('logs error message and exits with default code 1', () => {
      const mockMessage = 'Error occurred';

      exitWithError(mockMessage);

      expect(console.error).toHaveBeenCalledWith(mockMessage);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    test('logs error message and exits with specified code', () => {
      const mockMessage = 'Error occurred';
      const mockCode = 2;

      exitWithError(mockMessage, mockCode);

      expect(console.error).toHaveBeenCalledWith(mockMessage);
      expect(process.exit).toHaveBeenCalledWith(mockCode);
    });
  });
});