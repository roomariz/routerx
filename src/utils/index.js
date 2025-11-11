// src/utils/index.js
// Common utility functions for RouterX

import fs from 'fs';
import path from 'path';

/**
 * Utility functions for RouterX
 */
class Utils {
  /**
   * Create directory if it doesn't exist
   * @param {string} dirPath - Directory path to create
   */
  static ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Format timestamp for logging
   * @param {Date} date - Date object to format
   * @returns {string} Formatted timestamp
   */
  static formatTimestamp(date = new Date()) {
    const now = date;
    return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
  }

  /**
   * Normalize file path for different operating systems
   * @param {string} filePath - File path to normalize
   * @returns {string} Normalized file path
   */
  static normalizePath(filePath) {
    return path.normalize(filePath);
  }

  /**
   * Check if a file exists
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file exists
   */
  static fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Read file content
   * @param {string} filePath - Path to file
   * @returns {string} File content
   */
  static readFileContent(filePath) {
    if (!this.fileExists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Write content to file
   * @param {string} filePath - Path to file
   * @param {string} content - Content to write
   * @param {string} [encoding='utf-8'] - File encoding
   */
  static writeFileContent(filePath, content, encoding = 'utf-8') {
    const dir = path.dirname(filePath);
    this.ensureDirectory(dir);
    fs.writeFileSync(filePath, content, encoding);
  }
}

export default Utils;