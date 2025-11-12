import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { retryWithBackoff, DEFAULT_SHOULD_RETRY } from '../../src/resilience/retry.js';
import {
  ResiliencePolicy,
  resolveResilienceOverridesFromOptions
} from '../../src/resilience/policy.js';
import { mockEnv } from '../testUtils.js';

describe('retryWithBackoff', () => {
  test('retries the operation until success using exponential backoff options', async () => {
    const error = Object.assign(new Error('temporary network issue'), { code: 'ETIMEDOUT' });
    const operation = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('ok');
    const onRetry = jest.fn();

    const result = await retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelay: 0,
      maxDelay: 0,
      jitter: 0,
      onRetry
    });

    expect(result).toBe('ok');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenNthCalledWith(1, {
      attempt: 1,
      delay: 0,
      error
    });
    expect(onRetry).toHaveBeenNthCalledWith(2, {
      attempt: 2,
      delay: 0,
      error
    });
  });

  test('stops retrying when shouldRetry returns false and throws last error', async () => {
    const fatalError = new Error('fatal');
    const operation = jest.fn().mockRejectedValue(fatalError);
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(
      retryWithBackoff(operation, {
        maxRetries: 5,
        baseDelay: 0,
        maxDelay: 0,
        jitter: 0,
        shouldRetry
      })
    ).rejects.toBe(fatalError);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(shouldRetry).toHaveBeenCalledWith(fatalError);
  });

  test('honors deadline by aborting additional retries when exceeding deadline', async () => {
    jest.spyOn(Date, 'now').mockImplementationOnce(() => 0).mockImplementation(() => 0);
    const error = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    const operation = jest.fn().mockRejectedValue(error);
    const onRetry = jest.fn();

    await expect(
      retryWithBackoff(operation, {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 200,
        jitter: 0,
        deadlineMs: 50,
        onRetry
      })
    ).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
    expect(Date.now).toHaveBeenCalled();
    Date.now.mockRestore();
  });

  test('respects abort signals before executing the operation', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      retryWithBackoff(jest.fn(), { signal: controller.signal })
    ).rejects.toMatchObject({
      name: 'AbortError',
      code: 'RETRY_ABORTED',
      context: { reason: 'signal' }
    });
  });
});

describe('DEFAULT_SHOULD_RETRY', () => {
  test('returns true for 5xx responses', () => {
    expect(
      DEFAULT_SHOULD_RETRY({ response: { status: 502 } })
    ).toBe(true);
  });

  test('returns true for retryable network error codes', () => {
    expect(
      DEFAULT_SHOULD_RETRY({ code: 'ENOTFOUND' })
    ).toBe(true);
  });

  test('returns true for timeout messages', () => {
    expect(
      DEFAULT_SHOULD_RETRY({ message: 'Request Timeout hit' })
    ).toBe(true);
  });

  test('returns false when none of the conditions match', () => {
    expect(DEFAULT_SHOULD_RETRY(new Error('bad request'))).toBe(false);
  });
});

describe('ResiliencePolicy', () => {
  let restoreEnv;

  beforeEach(() => {
    restoreEnv = mockEnv({});
  });

  afterEach(() => {
    restoreEnv?.();
  });

  test('builds config using defaults and base configuration', () => {
    const policy = new ResiliencePolicy({
      timeout: 1000,
      maxRetries: 2,
      resilience: {
        baseDelayMs: 150,
        maxDelayMs: 600,
        jitterMs: 25
      }
    });

    expect(policy.config.timeoutMs).toBe(1000);
    expect(policy.config.maxRetries).toBe(2);
    expect(policy.config.baseDelayMs).toBe(150);
    expect(policy.config.maxDelayMs).toBe(600);
    expect(policy.config.jitterMs).toBe(25);
  });

  test('applies valid environment overrides and sanitizes values', () => {
    restoreEnv();
    restoreEnv = mockEnv({
      ROUTERX_TIMEOUT_MS: '45000',
      ROUTERX_MAX_RETRIES: '7',
      ROUTERX_RETRY_BASE_DELAY_MS: '100',
      ROUTERX_RETRY_MAX_DELAY_MS: '200',
      ROUTERX_RETRY_JITTER_MS: '75',
      ROUTERX_BREAKER_THRESHOLD: '5',
      ROUTERX_BREAKER_COOLDOWN_MS: '30000',
      ROUTERX_BREAKER_HALF_OPEN_SUCCESSES: '3',
      ROUTERX_BREAKER_HALF_OPEN_FAILURES: '2'
    });

    const policy = new ResiliencePolicy({
      resilience: {
        baseDelayMs: 10,
        maxDelayMs: 50
      }
    });

    expect(policy.config).toMatchObject({
      timeoutMs: 45000,
      maxRetries: 7,
      baseDelayMs: 100,
      maxDelayMs: 200,
      jitterMs: 75,
      breakerThreshold: 5,
      breakerCooldownMs: 30000,
      breakerHalfOpenSuccesses: 3,
      breakerHalfOpenFailures: 2
    });
  });

  test('ignores invalid runtime override values and keeps sanitized defaults', () => {
    const policy = new ResiliencePolicy(
      {
        maxRetries: 0,
        resilience: {
          baseDelayMs: 100,
          maxDelayMs: 500,
          breakerThreshold: -10
        }
      },
      {
        baseDelayMs: -1,
        maxDelayMs: -100,
        jitterMs: undefined,
        maxRetries: -3,
        breakerThreshold: -1
      }
    );

    expect(policy.config.baseDelayMs).toBe(100);
    expect(policy.config.maxDelayMs).toBe(500);
    expect(policy.config.maxRetries).toBe(0);
    expect(policy.config.breakerThreshold).toBe(1);
  });

  test('provides retry options merged with additional overrides', () => {
    const policy = new ResiliencePolicy({
      resilience: {
        maxRetries: 4,
        baseDelayMs: 100,
        maxDelayMs: 800,
        jitterMs: 10,
        timeoutMs: 2000
      }
    });

    expect(
      policy.getRetryOptions({ jitter: 5, custom: true })
    ).toMatchObject({
      maxRetries: 4,
      baseDelay: 100,
      maxDelay: 800,
      jitter: 5,
      deadlineMs: 2000,
      custom: true
    });
  });

  test('provides breaker options merged with additional overrides', () => {
    const policy = new ResiliencePolicy({
      resilience: {
        breakerThreshold: 10,
        breakerCooldownMs: 10000,
        breakerHalfOpenSuccesses: 2,
        breakerHalfOpenFailures: 3
      }
    });

    expect(
      policy.getBreakerOptions({ halfOpenMaxFailures: 4 })
    ).toMatchObject({
      threshold: 10,
      cooldownMs: 10000,
      halfOpenMaxSuccesses: 2,
      halfOpenMaxFailures: 4
    });
  });

  test('serializes configuration via toJSON', () => {
    const policy = new ResiliencePolicy({ resilience: { maxRetries: 5 } });
    expect(policy.toJSON()).toEqual(policy.config);
    expect(policy.toJSON()).not.toBe(policy.config);
  });
});

describe('resolveResilienceOverridesFromOptions', () => {
  test('maps CLI and API options to resilience overrides', () => {
    const overrides = resolveResilienceOverridesFromOptions({
      timeout: '2000',
      retryBaseDelay: '50',
      retryMaxDelayMs: 150,
      retryJitter: '25',
      breakerThreshold: '4',
      breakerCooldown: '60000',
      breakerHalfOpenSuccesses: '2',
      breakerHalfOpenFailures: '1'
    });

    expect(overrides).toEqual({
      timeoutMs: 2000,
      baseDelayMs: 50,
      maxDelayMs: 150,
      jitterMs: 25,
      breakerThreshold: 4,
      breakerCooldownMs: 60000,
      breakerHalfOpenSuccesses: 2,
      breakerHalfOpenFailures: 1
    });
  });

  test('ignores undefined, null, and non-numeric values', () => {
    const overrides = resolveResilienceOverridesFromOptions({
      timeoutMs: undefined,
      retryBaseDelay: '',
      retryMaxDelayMs: 'not-a-number',
      retryJitterMs: null
    });

    expect(overrides).toEqual({});
  });
});

