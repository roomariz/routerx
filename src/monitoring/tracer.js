import { logger as baseLogger } from './logger.js';
import { metrics } from './metrics.js';

export class RequestTracer {
  static generateTraceId() {
    return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  static normalizeOptions(options) {
    if (typeof options === 'string') {
      return { traceId: options };
    }

    if (options && typeof options === 'object') {
      return options;
    }

    return {};
  }

  static formatDuration(durationMs) {
    return `${Math.max(0, durationMs)}ms`;
  }

  static async withTrace(operationName, operation, options = {}) {
    if (typeof operation !== 'function') {
      throw new TypeError('RequestTracer.withTrace requires an async function operation');
    }

    const normalizedOptions = this.normalizeOptions(options);
    const traceId = normalizedOptions.traceId || this.generateTraceId();
    const targetLogger = normalizedOptions.logger || baseLogger;
    const traceMeta = {
      traceId,
      operation: operationName
    };
    const metricLabels = { operation: operationName };

    const operationLogger = typeof targetLogger.child === 'function'
      ? targetLogger.child(traceMeta)
      : targetLogger;

    const startTime = Date.now();

    try {
      targetLogger.info(`${operationName} started`, traceMeta);
      const operationArgs = operation.length >= 2
        ? [traceId, operationLogger]
        : [traceId];
      const result = await operation(...operationArgs);
      const duration = Date.now() - startTime;
      targetLogger.info(`${operationName} completed`, {
        ...traceMeta,
        duration: this.formatDuration(duration)
      });
      metrics.recordLatency('tracer.operation.duration_ms', duration, {
        ...metricLabels,
        status: 'success'
      });
      metrics.incrementCounter('tracer.operation.success_total', 1, metricLabels);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      targetLogger.error(`${operationName} failed`, {
        ...traceMeta,
        duration: this.formatDuration(duration),
        error: error?.message || error
      });
      metrics.recordLatency('tracer.operation.duration_ms', duration, {
        ...metricLabels,
        status: 'failure'
      });
      metrics.incrementCounter('tracer.operation.failure_total', 1, {
        ...metricLabels,
        error: error?.code || error?.name || 'error'
      });
      throw error;
    }
  }
}
// src/monitoring/tracer.js
