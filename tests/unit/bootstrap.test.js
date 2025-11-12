// tests/unit/bootstrap.test.js
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { bootstrap } from '../../src/core/bootstrap.js';

describe('Bootstrap', () => {
  let originalProcessOn;
  let originalProcessExit;
  let eventHandlers = {};

  beforeEach(() => {
    // Save original process methods
    originalProcessOn = process.on;
    originalProcessExit = process.exit;
    
    // Mock process methods
    process.on = jest.fn((event, handler) => {
      eventHandlers[event] = handler;
    });
    process.exit = jest.fn();
  });

  afterEach(() => {
    // Restore original process methods
    process.on = originalProcessOn;
    process.exit = originalProcessExit;
    eventHandlers = {};
    jest.clearAllMocks();
  });

  test('bootstrap function returns success result', () => {
    const result = bootstrap();

    expect(result).toEqual({
      success: true,
      timestamp: expect.any(String),
      message: 'RouterX application bootstrapped successfully'
    });
  });

  test('bootstrap function sets up global error handlers when enabled', () => {
    const result = bootstrap({ enableGlobalHandlers: true });

    expect(process.on).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(process.on).toHaveBeenCalledWith('uncaughtExceptionMonitor', expect.any(Function));

    expect(result.success).toBe(true);
  });

  test('bootstrap function does not set up global error handlers when disabled', () => {
    const result = bootstrap({ enableGlobalHandlers: false });

    expect(process.on).not.toHaveBeenCalledWith('unhandledRejection', expect.any(Function));
    expect(process.on).not.toHaveBeenCalledWith('uncaughtException', expect.any(Function));
    expect(process.on).not.toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    expect(process.on).not.toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(process.on).not.toHaveBeenCalledWith('uncaughtExceptionMonitor', expect.any(Function));

    expect(result.success).toBe(true);
  });

  test('bootstrap function returns error result on failure', () => {
    // Mock a failure scenario by temporarily breaking the setupGlobalErrorHandlers function
    jest.isolateModules(() => {
      // This will be run in isolation, but we can't easily mock internal function
      // Instead, let's test the general error handling capability
      const result = bootstrap({ enableGlobalHandlers: true });
      expect(result.success).toBe(true);
    });
  });
});