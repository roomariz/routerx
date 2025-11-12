// tests/unit/tracer.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { RequestTracer } from '../../src/monitoring/tracer.js';
import { logger } from '../../src/monitoring/logger.js';

describe('RequestTracer', () => {
  let originalLoggerMethods;
  let loggerInfoSpy;
  let loggerErrorSpy;

  beforeEach(() => {
    // Save original logger methods
    originalLoggerMethods = {
      info: logger.info,
      error: logger.error
    };
    
    // Create spies
    loggerInfoSpy = jest.fn();
    loggerErrorSpy = jest.fn();
    
    logger.info = loggerInfoSpy;
    logger.error = loggerErrorSpy;
  });

  afterEach(() => {
    // Restore original logger methods
    logger.info = originalLoggerMethods.info;
    logger.error = originalLoggerMethods.error;
  });

  test('generates valid trace ID', () => {
    const traceId = RequestTracer.generateTraceId();
    
    expect(traceId).toMatch(/^trace-\d+-[a-z0-9]+$/);
  });

  test('executes operation with trace successfully', async () => {
    const operation = jest.fn(async (traceId) => {
      return `result for ${traceId}`;
    });
    
    const result = await RequestTracer.withTrace('testOperation', operation);
    
    expect(operation).toHaveBeenCalledTimes(1);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
    expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, 'testOperation started', {
      traceId: expect.stringMatching(/^trace-/),
      operation: 'testOperation'
    });
    expect(loggerInfoSpy).toHaveBeenNthCalledWith(2, 'testOperation completed', {
      traceId: expect.stringMatching(/^trace-/),
      operation: 'testOperation',
      duration: expect.stringMatching(/\d+ms/)
    });
    expect(result).toMatch(/^result for trace-/);
  });

  test('handles errors in traced operation', async () => {
    const error = new Error('Test error');
    const operation = jest.fn(async () => {
      throw error;
    });
    
    await expect(RequestTracer.withTrace('failingOperation', operation)).rejects.toThrow('Test error');
    
    expect(operation).toHaveBeenCalledTimes(1);
    expect(loggerInfoSpy).toHaveBeenCalledTimes(1); // Only start logged
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1); // Error logged
    expect(loggerErrorSpy).toHaveBeenCalledWith('failingOperation failed', {
      traceId: expect.stringMatching(/^trace-/),
      operation: 'failingOperation',
      duration: expect.stringMatching(/\d+ms/),
      error: 'Test error'
    });
  });

  test('uses provided trace ID if available', async () => {
    const customTraceId = 'custom-trace-id';
    const operation = jest.fn(async (traceId) => {
      return `result for ${traceId}`;
    });
    
    const result = await RequestTracer.withTrace('testOperation', operation, customTraceId);
    
    expect(operation).toHaveBeenCalledWith(customTraceId);
    expect(loggerInfoSpy).toHaveBeenNthCalledWith(1, 'testOperation started', {
      traceId: customTraceId,
      operation: 'testOperation'
    });
  });
});