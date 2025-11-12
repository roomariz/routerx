import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pkg from '../../package.json' with { type: 'json' };
import { validateApiKey } from '../shared/utils/auth.js';
import { logger as defaultLogger } from './logger.js';

const DEFAULT_HEALTH_ENDPOINT = '/health';
const DEFAULT_FALLBACK_ENDPOINT = 'models?limit=1';
const DEFAULT_TIMEOUT_MS = 5000;

const STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy'
};

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function joinUrl(base, segment) {
  if (!segment) {
    return base;
  }

  if (/^https?:\/\//i.test(segment)) {
    return segment;
  }

  const normalizedBase = (base || '').replace(/\/+$/, '');
  const normalizedSegment = segment.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedSegment}`;
}

function iconForStatus(status) {
  switch (status) {
    case STATUS.HEALTHY:
      return '✅';
    case STATUS.DEGRADED:
      return '⚠️';
    default:
      return '❌';
  }
}

export class HealthChecker {
  constructor(config = {}, options = {}) {
    this.config = config || {};
    this.logger = options.logger || defaultLogger;
    this.healthEndpoint = options.healthEndpoint ?? DEFAULT_HEALTH_ENDPOINT;
    this.fallbackEndpoint = options.fallbackEndpoint ?? DEFAULT_FALLBACK_ENDPOINT;
    this.timeoutMs = this.resolveTimeout(options.timeoutMs);
    this.request = this.createRequestExecutor(options.httpClient);
    this.fs = options.fs || fs;
    this.fsPromises = options.fsPromises || this.fs?.promises || fs.promises;
    this.fsConstants = options.fsConstants || this.fs?.constants || fs.constants;
  }

  resolveTimeout(override) {
    return toPositiveNumber(override) ??
      toPositiveNumber(this.config?.resilience?.timeoutMs) ??
      toPositiveNumber(this.config?.timeout) ??
      DEFAULT_TIMEOUT_MS;
  }

  createRequestExecutor(client) {
    if (typeof client === 'function') {
      return client;
    }

    if (client && typeof client.request === 'function') {
      return (config) => client.request(config);
    }

    if (client && typeof client.get === 'function') {
      return (config) => client.get(config.url, config);
    }

    const axiosInstance = axios.create({
      validateStatus: () => true
    });

    return (config) => axiosInstance.request(config);
  }

  buildHeaders(extra = {}) {
    return {
      'User-Agent': `${pkg.name || 'routerx'}/${pkg.version || '1.0.0'} health-check`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...extra
    };
  }

  isSuccess(statusCode) {
    return Number.isFinite(statusCode) && statusCode >= 200 && statusCode < 300;
  }

  normalizeBaseUrl(baseUrl) {
    return baseUrl?.trim() || this.config?.defaultBaseUrl || '';
  }

  async makeRequest(url, options = {}) {
    const startedAt = Date.now();
    try {
      const response = await this.request({
        method: options.method ?? 'get',
        url,
        timeout: options.timeoutMs ?? this.timeoutMs,
        headers: this.buildHeaders(options.headers),
        data: options.data,
        params: options.params,
        validateStatus: options.validateStatus || (() => true)
      });

      return {
        ok: true,
        response,
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      return {
        ok: false,
        error,
        latencyMs: Date.now() - startedAt
      };
    }
  }

  buildCheckResult(name, status, { message, latencyMs, details }) {
    return {
      name,
      status,
      checkedAt: new Date().toISOString(),
      latencyMs,
      message,
      details: details || {}
    };
  }

  async checkAPIHealth(options = {}) {
    const baseUrl = this.normalizeBaseUrl(options.baseUrl);
    const endpoint = options.endpoint ?? this.healthEndpoint;
    const fallbackEndpoint = options.fallbackEndpoint ?? this.fallbackEndpoint;
    const timeoutMs = this.resolveTimeout(options.timeoutMs);
    const name = options.name || 'API Health';

    if (!baseUrl) {
      const message = 'API base URL is not configured';
      this.logger.error(message, { component: 'HealthChecker', check: name });
      return this.buildCheckResult(name, STATUS.UNHEALTHY, {
        message,
        details: { reason: 'missing_base_url' }
      });
    }

    const primaryUrl = joinUrl(baseUrl, endpoint);
    this.logger.info('Running API health check', { baseUrl, endpoint, timeoutMs });

    const primaryResult = await this.makeRequest(primaryUrl, { timeoutMs });

    if (primaryResult.ok && this.isSuccess(primaryResult.response?.status)) {
      const details = {
        baseUrl,
        endpoint,
        statusCode: primaryResult.response.status
      };

      this.logger.info('Primary health endpoint responded successfully', details);
      return this.buildCheckResult(name, STATUS.HEALTHY, {
        message: 'Health endpoint responded with success status',
        latencyMs: primaryResult.latencyMs,
        details
      });
    }

    if (primaryResult.ok && primaryResult.response?.status === 404 && fallbackEndpoint) {
      this.logger.warn('Health endpoint not available, attempting fallback', {
        baseUrl,
        endpoint,
        fallbackEndpoint
      });

      const fallbackUrl = joinUrl(baseUrl, fallbackEndpoint);
      const fallbackResult = await this.makeRequest(fallbackUrl, { timeoutMs });

      if (fallbackResult.ok && this.isSuccess(fallbackResult.response?.status)) {
        const details = {
          baseUrl,
          endpoint,
          fallbackEndpoint,
          statusCode: fallbackResult.response.status
        };

        return this.buildCheckResult(name, STATUS.DEGRADED, {
          message: 'Primary health endpoint missing, fallback succeeded',
          latencyMs: fallbackResult.latencyMs,
          details
        });
      }

      const details = {
        baseUrl,
        endpoint,
        fallbackEndpoint,
        fallbackStatus: fallbackResult.response?.status,
        error: fallbackResult.error?.message
      };

      return this.buildCheckResult(name, STATUS.UNHEALTHY, {
        message: 'Health endpoint missing and fallback failed',
        latencyMs: fallbackResult.latencyMs,
        details
      });
    }

    if (!primaryResult.ok) {
      const details = {
        baseUrl,
        endpoint,
        error: primaryResult.error?.message
      };

      this.logger.error('Unable to reach health endpoint', details);
      return this.buildCheckResult(name, STATUS.UNHEALTHY, {
        message: 'Unable to reach API health endpoint',
        latencyMs: primaryResult.latencyMs,
        details
      });
    }

    const details = {
      baseUrl,
      endpoint,
      statusCode: primaryResult.response?.status
    };

    return this.buildCheckResult(name, STATUS.UNHEALTHY, {
      message: `Health endpoint returned status ${primaryResult.response?.status ?? 'unknown'}`,
      latencyMs: primaryResult.latencyMs,
      details
    });
  }

  evaluateOverallStatus(checks = []) {
    if (checks.length === 0) {
      return STATUS.HEALTHY;
    }

    if (checks.some((check) => check.status === STATUS.UNHEALTHY)) {
      return STATUS.UNHEALTHY;
    }

    if (checks.some((check) => check.status === STATUS.DEGRADED)) {
      return STATUS.DEGRADED;
    }

    return STATUS.HEALTHY;
  }

  buildEnvironmentSnapshot() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      uptimeSeconds: Math.round(process.uptime())
    };
  }

  async checkApiKeyAvailability() {
    const name = 'API Key';
    const openAiKeyRaw = process.env.OPENAI_API_KEY;
    const openRouterKeyRaw = process.env.OPENROUTER_API_KEY;
    const apiKey = validateApiKey();
    const detectedSource = apiKey
      ? (openAiKeyRaw && openAiKeyRaw.trim() ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY')
      : undefined;

    const details = {
      sourcesChecked: ['OPENAI_API_KEY', 'OPENROUTER_API_KEY'],
      detectedSource
    };

    if (typeof apiKey === 'string' && apiKey.trim() !== '') {
      this.logger.debug?.('API key detected for health check', { component: 'HealthChecker', check: name, detectedSource });
      return this.buildCheckResult(name, STATUS.HEALTHY, {
        message: 'API key detected in environment',
        details
      });
    }

    this.logger.warn('API key missing for health check', { component: 'HealthChecker', check: name });
    return this.buildCheckResult(name, STATUS.UNHEALTHY, {
      message: 'Missing API key. Set OPENAI_API_KEY or OPENROUTER_API_KEY.',
      details
    });
  }

  resolveOutputPath(pathOverride) {
    const candidate = pathOverride ?? this.config?.defaultSavePath ?? './outputs';
    return path.isAbsolute(candidate) ? candidate : path.resolve(candidate);
  }

  async checkFilesystemReadiness(options = {}) {
    const name = 'Filesystem Readiness';
    const targetPath = this.resolveOutputPath(options.path);
    const details = { path: targetPath };

    try {
      const stats = await this.fsPromises.stat(targetPath);
      if (!stats.isDirectory()) {
        return this.buildCheckResult(name, STATUS.UNHEALTHY, {
          message: 'Output path is not a directory',
          details
        });
      }

      const fsConstants = this.fsConstants || fs.constants;
      if (fsConstants?.R_OK || fsConstants?.W_OK) {
        await this.fsPromises.access(targetPath, (fsConstants.R_OK ?? 0) | (fsConstants.W_OK ?? 0));
      } else {
        await this.fsPromises.access(targetPath);
      }

      this.logger.debug?.('Filesystem readiness check passed', { component: 'HealthChecker', path: targetPath });
      return this.buildCheckResult(name, STATUS.HEALTHY, {
        message: 'Output directory is accessible',
        details: { ...details, writable: true }
      });
    } catch (error) {
      const errorDetails = { ...details, error: error?.message };
      this.logger.error('Filesystem readiness check failed', { component: 'HealthChecker', ...errorDetails });
      return this.buildCheckResult(name, STATUS.UNHEALTHY, {
        message: 'Output directory is not accessible',
        details: errorDetails
      });
    }
  }

  async fullHealthCheck(options = {}) {
    const checks = [
      {
        name: 'API Health',
        runner: () => this.checkAPIHealth({
          baseUrl: options.baseUrl,
          endpoint: options.endpoint,
          timeoutMs: options.timeoutMs,
          fallbackEndpoint: options.fallbackEndpoint
        })
      },
      {
        name: 'API Key',
        runner: () => this.checkApiKeyAvailability()
      },
      {
        name: 'Filesystem Readiness',
        runner: () => this.checkFilesystemReadiness({
          path: options.savePath ?? options.outputPath
        })
      }
    ];

    const settled = await Promise.allSettled(checks.map((check) => check.runner()));

    const normalized = settled.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      const descriptor = checks[index];
      return this.buildCheckResult(descriptor.name, STATUS.UNHEALTHY, {
        message: 'Health check execution failed',
        details: { error: result.reason?.message || result.reason || 'Unknown error' }
      });
    });

    return {
      status: this.evaluateOverallStatus(normalized),
      timestamp: new Date().toISOString(),
      environment: this.buildEnvironmentSnapshot(),
      checks: normalized,
      summary: normalized.map((check) => `${iconForStatus(check.status)} ${check.name}`).join(', ')
    };
  }
}

export const healthCheckerStatus = STATUS;
