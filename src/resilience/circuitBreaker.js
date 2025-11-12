// src/resilience/circuitBreaker.js

export class CircuitBreakerOpenError extends Error {
  constructor(message, meta = {}) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.code = 'CIRCUIT_BREAKER_OPEN';
    this.meta = meta;
  }
}

export class CircuitBreaker {
  constructor(options = {}) {
    const {
      threshold = 5,
      cooldownMs = 60000,
      halfOpenMaxSuccesses = 1,
      halfOpenMaxFailures = 1,
      clock = () => Date.now(),
      errorFilter = () => true,
      onStateChange = () => {},
      logger
    } = options;

    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.halfOpenMaxSuccesses = halfOpenMaxSuccesses;
    this.halfOpenMaxFailures = halfOpenMaxFailures;
    this.clock = clock;
    this.errorFilter = errorFilter;
    this.onStateChange = onStateChange;
    this.logger = logger;

    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }

  async execute(action, context = {}) {
    const now = this.clock();
    const stateSnapshot = this.getStateSnapshot();

    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime < this.cooldownMs) {
        this.logger?.warn?.('Circuit breaker prevented call', {
          ...context,
          ...stateSnapshot
        });

        throw new CircuitBreakerOpenError(
          'Circuit breaker is OPEN',
          { ...stateSnapshot }
        );
      }

      this.transitionTo('HALF_OPEN');
      this.resetCounters();
    }

    try {
      const result = await action();
      this.recordSuccess(context);
      return result;
    } catch (error) {
      this.recordFailure(error, context);
      throw error;
    }
  }

  recordSuccess(context = {}) {
    if (this.state === 'HALF_OPEN') {
      this.successCount += 1;
      if (this.successCount >= this.halfOpenMaxSuccesses) {
        this.transitionTo('CLOSED', context);
      }
      return;
    }

    if (this.state === 'OPEN') {
      this.transitionTo('HALF_OPEN', context);
      this.successCount = 1;
      return;
    }

    this.resetCounters();
  }

  recordFailure(error, context = {}) {
    if (!this.errorFilter(error)) {
      return;
    }

    this.failureCount += 1;
    this.lastFailureTime = this.clock();

    if (this.state === 'HALF_OPEN') {
      this.logger?.warn?.('Circuit breaker reverting to OPEN from HALF_OPEN', {
        ...context,
        failureCount: this.failureCount,
        error: error.message
      });
      this.transitionTo('OPEN', context);
      return;
    }

    if (this.failureCount >= this.threshold) {
      this.logger?.warn?.('Circuit breaker opened', {
        ...context,
        failureCount: this.failureCount,
        error: error.message
      });
      this.transitionTo('OPEN', context);
    }
  }

  transitionTo(state, context = {}) {
    if (state === this.state) {
      return;
    }

    const previousState = this.state;
    this.state = state;

    if (state === 'CLOSED') {
      this.resetCounters();
    }

    this.onStateChange({
      previousState,
      currentState: state,
      timestamp: this.clock(),
      context,
    });
  }

  resetCounters() {
    this.failureCount = 0;
    this.successCount = 0;
  }

  reset() {
    this.state = 'CLOSED';
    this.resetCounters();
    this.lastFailureTime = 0;
  }

  getStateSnapshot() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      threshold: this.threshold,
      cooldownMs: this.cooldownMs,
      lastFailureTime: this.lastFailureTime
    };
  }

  toJSON() {
    return this.getStateSnapshot();
  }
}

