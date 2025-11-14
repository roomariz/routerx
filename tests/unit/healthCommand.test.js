import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

const mockFullHealthCheck = jest.fn();

jest.mock('../../src/infrastructure/config/runtimeConfig.js', () => ({
  getRuntimeConfig: jest.fn(() => ({
    defaultBaseUrl: 'https://api.test',
    resilience: { timeoutMs: 2500 }
  }))
}));

jest.mock('../../src/monitoring/health.js', () => {
  const actual = jest.requireActual('../../src/monitoring/health.js');
  return {
    ...actual,
    HealthChecker: jest.fn().mockImplementation(() => ({
      fullHealthCheck: mockFullHealthCheck
    }))
  };
});

jest.mock('../../src/shared/utils/error.js', () => ({
  handleError: jest.fn()
}));

const { HealthChecker, healthCheckerStatus } = require('../../src/monitoring/health.js');
const { handleError } = require('../../src/shared/utils/error.js');
const { handleHealthCommand } = require('../../src/commands/health/handler.js');

describe('health command handler', () => {
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    process.exitCode = undefined;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    process.exitCode = undefined;
  });

  test('prints human readable report when health is healthy', async () => {
    mockFullHealthCheck.mockResolvedValue({
      status: healthCheckerStatus.HEALTHY,
      timestamp: '2024-01-01T00:00:00.000Z',
      summary: '✅ API Health',
      checks: [
        {
          name: 'API Health',
          status: healthCheckerStatus.HEALTHY,
          message: 'ok',
          details: { statusCode: 200 }
        }
      ]
    });

    const report = await handleHealthCommand({});

    expect(report.status).toBe(healthCheckerStatus.HEALTHY);
    const lines = console.log.mock.calls.map(([line]) => line);
    expect(lines.some((line) => typeof line === 'string' && line.includes('RouterX Health'))).toBe(true);
    expect(lines.some((line) => typeof line === 'string' && line.includes('Overall Status'))).toBe(true);
    expect(process.exitCode).toBeUndefined();
    expect(HealthChecker).toHaveBeenCalledTimes(1);
  });

  test('prints JSON when --json is provided and exits with non-zero code on degraded status', async () => {
    const report = {
      status: healthCheckerStatus.DEGRADED,
      timestamp: '2024-01-01T00:00:01.000Z',
      summary: '⚠️ API Health',
      checks: [
        {
          name: 'API Health',
          status: healthCheckerStatus.DEGRADED,
          message: 'Fallback used'
        }
      ]
    };

    mockFullHealthCheck.mockResolvedValue(report);

    const result = await handleHealthCommand({ json: true });

    expect(console.log).toHaveBeenCalledWith(JSON.stringify(report, null, 2));
    expect(result.status).toBe(healthCheckerStatus.DEGRADED);
    expect(process.exitCode).toBe(1);
  });

  test('handles errors from health checker', async () => {
    const failure = new Error('boom');
    mockFullHealthCheck.mockRejectedValue(failure);

    const result = await handleHealthCommand({});

    expect(result).toBeNull();
    expect(handleError).toHaveBeenCalledWith(failure, 'HEALTH_CHECK_FAILED', expect.any(Object));
    expect(process.exitCode).toBe(1);
  });
});
