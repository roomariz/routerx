// src/infrastructure/api/apiClient.js
import axios from 'axios';
import { retryWithBackoff } from '../../resilience/retry.js';
import { CircuitBreaker } from '../../resilience/circuitBreaker.js';
import { createResiliencePolicy } from '../../resilience/policy.js';
import { logger as defaultLogger } from '../../monitoring/logger.js';
import { metrics } from '../../monitoring/metrics.js';
import { handleAPIError, createRouterXError } from '../../shared/utils/error.js';
import { RouterXError } from '../../shared/utils/routerxError.js';

/**
 * API Client for RouterX
 * Handles all API interactions with the AI service and applies resilience safeguards
 */
class ApiClient {
  constructor(config = {}, options = {}) {
    this.config = config;
    this.logger = options.logger || defaultLogger;
    this.policy = options.resiliencePolicy || createResiliencePolicy(config, options.resilienceOverrides);

    this.axiosInstance = axios.create({
      timeout: this.policy.getTimeoutMs(),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.circuitBreaker = new CircuitBreaker({
      ...this.policy.getBreakerOptions(),
      logger: this.logger,
      onStateChange: (change) => this.handleBreakerStateChange(change)
    });
  }

  handleBreakerStateChange(change) {
    const timestamp = Number.isFinite(change.timestamp)
      ? new Date(change.timestamp).toISOString()
      : new Date().toISOString();

    this.logger?.info?.('Circuit breaker state changed', {
      previousState: change.previousState,
      currentState: change.currentState,
      timestamp,
      context: change.context
    });

    metrics.incrementCounter('resilience.breaker.state_change_total', 1, {
      from: change.previousState,
      to: change.currentState,
      operation: change.context?.operation
    });

    if (change.currentState === 'OPEN') {
      metrics.incrementCounter('resilience.breaker.open_total', 1, {
        operation: change.context?.operation
      });
    }
  }

  async executeWithResilience(operation, meta = {}) {
    const {
      operationName = 'apiOperation',
      retryOverrides = {},
      timeoutMs = this.policy.getTimeoutMs(),
      breakerContext = {},
      shouldRetry
    } = meta;

    const controller = new AbortController();
    const { signal } = controller;
    let timeoutId = null;

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }

    const baseRetryOptions = this.policy.getRetryOptions();
    const configuredDeadline = retryOverrides.deadlineMs ?? baseRetryOptions.deadlineMs ?? timeoutMs;
    const deadlineMs = Number.isFinite(configuredDeadline)
      ? Math.min(configuredDeadline, timeoutMs)
      : timeoutMs;

    const finalRetryOptions = {
      ...baseRetryOptions,
      ...retryOverrides,
      signal,
      deadlineMs
    };

    if (typeof shouldRetry === 'function') {
      finalRetryOptions.shouldRetry = shouldRetry;
    }

    const userOnRetry = finalRetryOptions.onRetry;
    const metricLabels = { operation: operationName };
    const startedAt = Date.now();

    finalRetryOptions.onRetry = async (info) => {
      this.logger?.warn?.('Retrying API operation', {
        operation: operationName,
        attempt: info.attempt,
        delay: info.delay,
        error: info.error?.message
      });

      metrics.incrementCounter('api.operation.retry_total', 1, {
        operation: operationName
      });

      if (typeof userOnRetry === 'function') {
        await userOnRetry(info);
      }
    };

    try {
      const result = await this.circuitBreaker.execute(
        () => retryWithBackoff(
          (retryContext) => operation({
            ...retryContext,
            signal,
            timeoutMs
          }),
          finalRetryOptions
        ),
        { ...breakerContext, operation: operationName }
      );

      const durationMs = Date.now() - startedAt;
      this.logger?.debug?.('API operation succeeded', {
        operation: operationName
      });
      metrics.recordLatency('api.operation.duration_ms', durationMs, {
        operation: operationName,
        status: 'success'
      });
      metrics.incrementCounter('api.operation.success_total', 1, metricLabels);

      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error.name === 'AbortError') {
        const timeoutError = createRouterXError(
          `Operation '${operationName}' timed out after ${timeoutMs}ms`,
          'REQUEST_TIMEOUT',
          { ...breakerContext, operation: operationName, timeoutMs },
          'api'
        );

        this.logger?.error?.('API operation timed out', {
          operation: operationName,
          timeoutMs
        });

         metrics.recordLatency('api.operation.duration_ms', durationMs, {
           operation: operationName,
           status: 'timeout'
         });
         metrics.incrementCounter('api.operation.timeout_total', 1, metricLabels);

        throw timeoutError;
      }

      this.logger?.warn?.('API operation failed', {
        operation: operationName,
        error: error.message
      });

      metrics.recordLatency('api.operation.duration_ms', durationMs, {
        operation: operationName,
        status: 'failure'
      });
      metrics.incrementCounter('api.operation.failure_total', 1, {
        ...metricLabels,
        error: error.code || error.name || 'error'
      });

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Make a chat completion API call with streaming
   * @param {string} apiKey - API key for authentication
   * @param {string} model - Model to use
   * @param {string} prompt - User prompt
   * @param {string} baseUrl - API base URL
   * @param {Object} options - Additional execution options
   * @returns {Promise<Object>} API response stream
   */
  async makeChatCompletion(apiKey, model, prompt, baseUrl, options = {}) {
    const context = { operation: 'makeChatCompletion', model, baseUrl };

    try {
      return await this.executeWithResilience(
        ({ signal, timeoutMs }) => this.axiosInstance({
          method: 'post',
          url: `${baseUrl}/chat/completions`,
          data: {
            model,
            stream: true,
            messages: [{ role: 'user', content: prompt }],
          },
          responseType: 'stream',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal,
          timeout: timeoutMs
        }),
        {
          operationName: 'makeChatCompletion',
          breakerContext: context,
          retryOverrides: options.retryOverrides,
          timeoutMs: options.timeoutMs ?? this.policy.getTimeoutMs(),
          shouldRetry: options.shouldRetry
        }
      );
    } catch (error) {
      if (error instanceof RouterXError) {
        throw error;
      }

      throw handleAPIError(error, context);
    }
  }

  /**
   * Fetch available models from API
   * @param {string} baseUrl - API base URL
   * @param {Object} options - Additional execution options
   * @returns {Promise<Object>} API response with models
   */
  async fetchModels(baseUrl, options = {}) {
    const context = { operation: 'fetchModels', baseUrl };

    try {
      return await this.executeWithResilience(
        ({ signal, timeoutMs }) => this.axiosInstance.get(`${baseUrl}/models`, {
          signal,
          timeout: timeoutMs
        }),
        {
          operationName: 'fetchModels',
          breakerContext: context,
          retryOverrides: options.retryOverrides,
          timeoutMs: options.timeoutMs ?? this.policy.getTimeoutMs(),
          shouldRetry: options.shouldRetry
        }
      );
    } catch (error) {
      if (error instanceof RouterXError) {
        throw error;
      }

      throw handleAPIError(error, context);
    }
  }

  /**
   * Make a general chat API call (non-streaming)
   * @param {string} apiKey - API key for authentication
   * @param {string} model - Model to use
   * @param {string} prompt - User prompt
   * @param {string} baseUrl - API base URL
   * @param {Object} options - Additional execution options
   * @returns {Promise<Object>} API response
   */
  async makeGeneralChat(apiKey, model, prompt, baseUrl, options = {}) {
    const context = { operation: 'makeGeneralChat', model, baseUrl };

    try {
      return await this.executeWithResilience(
        ({ signal, timeoutMs }) => this.axiosInstance.post(
          `${baseUrl}/chat/completions`,
          { model, messages: [{ role: 'user', content: prompt }] },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal,
            timeout: timeoutMs
          }
        ),
        {
          operationName: 'makeGeneralChat',
          breakerContext: context,
          retryOverrides: options.retryOverrides,
          timeoutMs: options.timeoutMs ?? this.policy.getTimeoutMs(),
          shouldRetry: options.shouldRetry
        }
      );
    } catch (error) {
      if (error instanceof RouterXError) {
        throw error;
      }

      throw handleAPIError(error, context);
    }
  }

  /**
   * Public method to handle errors similar to the internal handleAPIError function
   * @param {Error} error - The error to handle
   * @returns {Error} Formatted error object
   */
  handleError(error) {
    return handleAPIError(error, { operation: 'test' });
  }
}

export default ApiClient;
