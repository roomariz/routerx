import { describe, test, expect, jest, afterEach } from '@jest/globals';
import { HealthChecker, healthCheckerStatus } from '../../src/monitoring/health.js';

const baseConfig = {
  defaultBaseUrl: 'https://api.test/v1',
  resilience: {
    timeoutMs: 1500
  }
};

const originalEnv = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY
};

function restoreEnv(key) {
  if (originalEnv[key] === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = originalEnv[key];
  }
}

afterEach(() => {
  restoreEnv('OPENAI_API_KEY');
  restoreEnv('OPENROUTER_API_KEY');
  restoreEnv('GEMINI_API_KEY');
});

describe('HealthChecker', () => {
  test('reports healthy when primary endpoint succeeds', async () => {
    const httpClient = jest.fn().mockResolvedValue({
      status: 200,
      data: { status: 'ok' }
    });

    const checker = new HealthChecker(baseConfig, { httpClient });
    const result = await checker.checkAPIHealth();

    expect(result.status).toBe(healthCheckerStatus.HEALTHY);
    expect(result.details.statusCode).toBe(200);
    expect(httpClient).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://api.test/v1/health'
    }));
  });

  test('reports degraded when fallback succeeds after 404', async () => {
    const httpClient = jest.fn()
      .mockResolvedValueOnce({ status: 404 })
      .mockResolvedValueOnce({ status: 200 });

    const checker = new HealthChecker(baseConfig, { httpClient });
    const result = await checker.checkAPIHealth();

    expect(result.status).toBe(healthCheckerStatus.DEGRADED);
    expect(result.details.fallbackEndpoint).toBe('models?limit=1');
    expect(httpClient).toHaveBeenCalledTimes(2);
  });

  test('API key check reports healthy when key is present', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const checker = new HealthChecker(baseConfig);
    const result = await checker.checkApiKeyAvailability();

    expect(result.status).toBe(healthCheckerStatus.HEALTHY);
    expect(result.details.detectedSource).toBe('OPENAI_API_KEY');
  });

  test('API key check detects GEMINI_API_KEY when it is the only key set', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    process.env.GEMINI_API_KEY = 'gm-test';

    const checker = new HealthChecker(baseConfig);
    const result = await checker.checkApiKeyAvailability();

    expect(result.status).toBe(healthCheckerStatus.HEALTHY);
    expect(result.details.detectedSource).toBe('GEMINI_API_KEY');
    expect(result.details.sourcesChecked).toEqual(['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'GEMINI_API_KEY']);
  });

  test('API key check reports unhealthy when keys are missing', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const checker = new HealthChecker(baseConfig);
    const result = await checker.checkApiKeyAvailability();

    expect(result.status).toBe(healthCheckerStatus.UNHEALTHY);
    expect(result.message).toContain('Missing API key');
  });

  test('filesystem readiness reports healthy when directory is accessible', async () => {
    const fsStub = {
      promises: {
        stat: jest.fn().mockResolvedValue({ isDirectory: () => true }),
        access: jest.fn().mockResolvedValue(),
        mkdir: jest.fn()
      },
      constants: { R_OK: 4, W_OK: 2 }
    };

    const checker = new HealthChecker(baseConfig, { fs: fsStub });
    const result = await checker.checkFilesystemReadiness({ path: './outputs' });

    expect(result.status).toBe(healthCheckerStatus.HEALTHY);
    expect(fsStub.promises.stat).toHaveBeenCalled();
    expect(fsStub.promises.access).toHaveBeenCalled();
  });

  test('filesystem readiness reports unhealthy when directory is unavailable', async () => {
    const missingError = new Error('missing directory');
    const fsStub = {
      promises: {
        stat: jest.fn().mockRejectedValue(missingError),
        access: jest.fn(),
        mkdir: jest.fn()
      },
      constants: { R_OK: 4, W_OK: 2 }
    };

    const checker = new HealthChecker(baseConfig, { fs: fsStub });
    const result = await checker.checkFilesystemReadiness({ path: './outputs' });

    expect(result.status).toBe(healthCheckerStatus.UNHEALTHY);
    expect(result.details.error).toContain('missing directory');
  });

  test('full health check reports unhealthy when requests fail', async () => {
    const httpClient = jest.fn().mockRejectedValue(new Error('unreachable'));
    const fsStub = {
      promises: {
        stat: jest.fn().mockResolvedValue({ isDirectory: () => true }),
        access: jest.fn().mockResolvedValue(),
        mkdir: jest.fn()
      },
      constants: { R_OK: 4, W_OK: 2 }
    };
    process.env.OPENAI_API_KEY = 'test-key';
    const checker = new HealthChecker(baseConfig, { httpClient, fs: fsStub });

    const report = await checker.fullHealthCheck();

    expect(report.status).toBe(healthCheckerStatus.UNHEALTHY);
    const statusesByName = Object.fromEntries(report.checks.map((check) => [check.name, check.status]));
    expect(statusesByName['API Health']).toBe(healthCheckerStatus.UNHEALTHY);
    expect(statusesByName['API Key']).toBe(healthCheckerStatus.HEALTHY);
    expect(statusesByName['Filesystem Readiness']).toBe(healthCheckerStatus.HEALTHY);
  });
  test('filesystem readiness surfaces missing directories without creating them', async () => {
    const enoentError = new Error('missing directory');
    enoentError.code = 'ENOENT';
    const fsStub = {
      promises: {
        stat: jest.fn().mockRejectedValue(enoentError),
        access: jest.fn(),
        mkdir: jest.fn()
      },
      constants: { R_OK: 4, W_OK: 2 }
    };

    const checker = new HealthChecker(baseConfig, { fs: fsStub });
    const result = await checker.checkFilesystemReadiness({ path: './outputs' });

    expect(result.status).toBe(healthCheckerStatus.UNHEALTHY);
    expect(result.details.missing).toBe(true);
    expect(fsStub.promises.mkdir).not.toHaveBeenCalled();
  });
});
