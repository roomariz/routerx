// tests/shared/utils/file.test.js
// Unit tests for file utilities

import { ensureDirectory, fileExists, readFileContent, writeFileContent } from '../../../src/shared/utils/file.js';
import fs from 'fs';
import path from 'path';

// Mock file system operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('File Utilities', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should check if file exists', () => {
    const testPath = '/test/path';
    fs.existsSync.mockReturnValue(true);
    
    const result = fileExists(testPath);
    
    expect(fs.existsSync).toHaveBeenCalledWith(testPath);
    expect(result).toBe(true);
  });

  test('should create directory if it does not exist', () => {
    const testPath = '/test/dir';
    fs.existsSync.mockReturnValue(false);
    
    ensureDirectory(testPath);
    
    expect(fs.existsSync).toHaveBeenCalledWith(testPath);
    expect(fs.mkdirSync).toHaveBeenCalledWith(testPath, { recursive: true });
  });
});