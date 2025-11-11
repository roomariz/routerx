// src/shared/utils/file.js
// File utility functions for RouterX

import fs from 'fs';
import path from 'path';

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path to create
 */
export function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Format timestamp for logging
 * @param {Date} date - Date object to format
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp(date = new Date()) {
  const now = date;
  return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}

/**
 * Normalize file path for different operating systems
 * @param {string} filePath - File path to normalize
 * @returns {string} Normalized file path
 */
export function normalizePath(filePath) {
  return path.resolve(filePath);
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {boolean} True if file exists
 */
export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Read file content
 * @param {string} filePath - Path to file
 * @returns {string} File content
 */
export function readFileContent(filePath) {
  if (!fileExists(filePath)) {
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
export function writeFileContent(filePath, content, encoding = 'utf-8') {
  const dir = path.dirname(filePath);
  ensureDirectory(dir);
  fs.writeFileSync(filePath, content, encoding);
}

/**
 * Resolve path relative to current working directory
 * @param {string} relativePath - The relative path to resolve
 * @returns {string} Absolute path resolved from current working directory
 */
export function resolvePath(relativePath) {
  return path.resolve(process.cwd(), relativePath);
}