// tests/unit/logger.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { Logger, logger } from '../../src/monitoring/logger.js';

describe('Logger', () => {
  let originalConsoleLog;
  let consoleLogMock;

  beforeEach(() => {
    originalConsoleLog = console.log;
    consoleLogMock = jest.fn();
    console.log = consoleLogMock;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  test('creates logger instance with default level', () => {
    const log = new Logger();
    
    expect(log.level).toBe('info');
    expect(log.enableJsonOutput).toBe(false);
  });

  test('creates logger instance with custom level and json output', () => {
    const log = new Logger('debug', true);
    
    expect(log.level).toBe('debug');
    expect(log.enableJsonOutput).toBe(true);
  });

  test('logs message when level is sufficient', () => {
    const log = new Logger('info');
    log.info('Test message', { data: 'value' });

    expect(consoleLogMock).toHaveBeenCalled();
  });

  test('does not log message when level is insufficient', () => {
    const log = new Logger('error');
    log.info('Test message', { data: 'value' });

    expect(consoleLogMock).not.toHaveBeenCalled();
  });

  test('logs in JSON format when enabled', () => {
    const log = new Logger('info', true);
    log.info('Test message', { data: 'value' });

    expect(consoleLogMock).toHaveBeenCalledTimes(1);
    const callArgs = consoleLogMock.mock.calls[0];
    const loggedJsonString = callArgs[0];
    
    expect(loggedJsonString).toContain('"level":"info"');
    expect(loggedJsonString).toContain('"message":"Test message"');
    expect(loggedJsonString).toContain('"data":"value"');
  });

  test('logs with colors when JSON output is disabled', () => {
    const log = new Logger('info', false);
    log.info('Test message', { data: 'value' });

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Test message'),
      expect.stringContaining(JSON.stringify({ data: 'value' }))
    );
  });

  test('provides convenience methods for different log levels', () => {
    const log = new Logger('debug', false);
    
    log.debug('Debug message');
    log.info('Info message');
    log.warn('Warning message');
    log.error('Error message');

    expect(consoleLogMock).toHaveBeenCalledTimes(4);
  });

  test('logger singleton works correctly', () => {
    expect(logger).toBeInstanceOf(Logger);
  });
});