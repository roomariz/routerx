// src/monitoring/tracer.js
import { logger } from './logger.js';

export class RequestTracer {
  static generateTraceId() {
    return 'trace-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  static async withTrace(operationName, operation, traceId = null) {
    const id = traceId || this.generateTraceId();
    const startTime = Date.now();

    try {
      logger.info(`${operationName} started`, { traceId: id, operation: operationName });
      const result = await operation(id);
      const duration = Date.now() - startTime;
      logger.info(`${operationName} completed`, {
        traceId: id,
        operation: operationName,
        duration: `${duration}ms`
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`${operationName} failed`, {
        traceId: id,
        operation: operationName,
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }
}