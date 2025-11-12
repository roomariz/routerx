// src/resilience/retry.js
import { createRouterXError } from '../shared/utils/error.js';

const DEFAULT_SHOULD_RETRY = (error) => {
  if (!error) {
    return false;
  }

  const responseStatus = error.response?.status;
  const errorCode = error.code;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';

  if (responseStatus && responseStatus >= 500) {
    return true;
  }

  if (errorCode && ['ECONNABORTED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(errorCode)) {
    return true;
  }

  if (message.includes('timeout') || message.includes('network')) {
    return true;
  }

  return false;
};

const createAbortError = () => {
  const error = createRouterXError(
    'Retry aborted by caller',
    'RETRY_ABORTED',
    { reason: 'signal' }
  );
  error.name = 'AbortError';
  return error;
};

const wait = (delay, signal) => new Promise((resolve, reject) => {
  if (delay <= 0) {
    resolve();
    return;
  }

  const timeoutId = setTimeout(handleCompletion, delay);

  function cleanup() {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', handleAbort);
    }
  }

  function handleCompletion() {
    cleanup();
    resolve();
  }

  function handleAbort() {
    cleanup();
    reject(createAbortError());
  }

  if (signal) {
    if (signal.aborted) {
      cleanup();
      reject(createAbortError());
    } else {
      signal.addEventListener('abort', handleAbort, { once: true });
    }
  }
});

export async function retryWithBackoff(operation, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 8000,
    jitter = 100,
    signal,
    deadlineMs,
    shouldRetry = DEFAULT_SHOULD_RETRY,
    onRetry = () => {}
  } = options;

  let attempt = 0;
  let lastError;
  const startTime = Date.now();

  while (attempt <= maxRetries) {
    if (signal?.aborted) {
      throw createAbortError();
    }

    try {
      const context = { attempt, maxRetries, signal };
      return await operation(context);
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxRetries) {
        break;
      }

      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const boundedDelay = Math.min(maxDelay, exponentialDelay);
      const jitterDelay = jitter > 0 ? Math.random() * jitter : 0;
      const totalDelay = Math.floor(boundedDelay + jitterDelay);

      if (deadlineMs) {
        const elapsed = Date.now() - startTime;
        if (elapsed + totalDelay > deadlineMs) {
          break;
        }
      }

      await onRetry({
        attempt: attempt + 1,
        delay: totalDelay,
        error
      });

      try {
        await wait(totalDelay, signal);
      } catch (abortError) {
        throw abortError;
      }
    }

    attempt += 1;
  }

  throw lastError;
}

export { DEFAULT_SHOULD_RETRY };


