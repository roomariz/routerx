// src/monitoring/logger.js
import chalk from 'chalk';
import dayjs from 'dayjs';

class Logger {
  constructor(level = 'info', enableJsonOutput = false) {
    this.level = level;
    this.enableJsonOutput = enableJsonOutput;
    this.levelMap = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3
    };
  }

  log(level, message, meta = {}) {
    if (this.levelMap[level] < this.levelMap[this.level]) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta
    };

    if (this.enableJsonOutput) {
      console.log(JSON.stringify(logEntry));
    } else {
      const timestamp = chalk.dim(dayjs().format('HH:mm:ss'));
      const levelColor = this.getLevelColor(level);
      if (Object.keys(meta).length > 0) {
        const metaString = this.sanitizeForLogging(meta);
        console.log(`${timestamp} [${levelColor(level.toUpperCase())}] ${message}`, metaString);
      } else {
        console.log(`${timestamp} [${levelColor(level.toUpperCase())}] ${message}`);
      }
    }
  }

  getLevelColor(level) {
    switch (level) {
      case 'error': return chalk.red;
      case 'warn': return chalk.yellow;
      case 'info': return chalk.blue;
      case 'debug': return chalk.gray;
      default: return chalk.white;
    }
  }

  sanitizeForLogging(obj) {
    try {
      // Create a deep copy to avoid modifying the original object
      const sanitized = JSON.parse(JSON.stringify(obj, (key, value) => {
        // Sanitize string values that might contain problematic characters
        if (typeof value === 'string') {
          // Remove or replace problematic characters that might corrupt console output
          return value
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\r\n/g, '\\r\\n') // Escape newlines
            .replace(/\n/g, '\\n')      // Escape newlines
            .replace(/\r/g, '\\r')      // Escape carriage returns
            .substring(0, 1000); // Limit length to prevent extremely long logs
        }
        return value;
      }));
      return JSON.stringify(sanitized);
    } catch (error) {
      // If sanitization fails, return a safe fallback
      return JSON.stringify({ error: 'Could not sanitize log metadata' });
    }
  }

  info(message, meta = {}) { this.log('info', message, meta); }
  error(message, meta = {}) { this.log('error', message, meta); }
  warn(message, meta = {}) { this.log('warn', message, meta); }
  debug(message, meta = {}) { this.log('debug', message, meta); }
}

// Create a default logger instance
const logger = new Logger();

export { Logger, logger };