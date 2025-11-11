// tests/unit/utils.test.js
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import * as Utils from '../../src/shared/utils/index.js';

// Mock the modules that need to be mocked
jest.mock('fs');
jest.mock('path');

describe('Utils', () => {
  describe('ensureDirectory', () => {
    test('creates directory if it doesn\'t exist', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.mkdirSync = jest.fn();

      Utils.ensureDirectory('/test/path');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/path');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/test/path', { recursive: true });
    });

    test('does not create directory if it already exists', () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.mkdirSync = jest.fn();

      Utils.ensureDirectory('/test/path');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/path');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    test('handles directory creation errors', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.mkdirSync = jest.fn().mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        Utils.ensureDirectory('/test/path');
      }).toThrow('Permission denied');
    });
  });

  describe('formatTimestamp', () => {
    test('formats timestamp correctly', () => {
      const mockDate = new Date(2023, 0, 1, 14, 30, 45);
      const formatted = Utils.formatTimestamp(mockDate);

      expect(formatted).toBe('[14:30:45]');
    });

    test('formats current time when no date provided', () => {
      const formatted = Utils.formatTimestamp();

      // Check if it matches the expected format [HH:MM:SS]
      expect(formatted).toMatch(/^\[\d{2}:\d{2}:\d{2}\]$/);
    });
  });

  describe('normalizePath', () => {
    test('normalizes file path for different operating systems', () => {
      path.resolve = jest.fn().mockReturnValue('/normalized/path');

      const normalized = Utils.normalizePath('/test/path');

      expect(path.resolve).toHaveBeenCalledWith('/test/path');
      expect(normalized).toBe('/normalized/path');
    });
  });

  describe('fileExists', () => {
    test('returns true when file exists', () => {
      fs.existsSync = jest.fn().mockReturnValue(true);

      const exists = Utils.fileExists('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(exists).toBe(true);
    });

    test('returns false when file does not exist', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      const exists = Utils.fileExists('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(exists).toBe(false);
    });
  });

  describe('readFileContent', () => {
    test('reads file content when file exists', () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue('file content');

      const content = Utils.readFileContent('/test/file.txt');

      expect(fs.existsSync).toHaveBeenCalledWith('/test/file.txt');
      expect(fs.readFileSync).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
      expect(content).toBe('file content');
    });

    test('throws error when file does not exist', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);

      expect(() => {
        Utils.readFileContent('/test/file.txt');
      }).toThrow('File does not exist: /test/file.txt');
    });

    test('handles file read errors', () => {
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Read error');
      });

      expect(() => {
        Utils.readFileContent('/test/file.txt');
      }).toThrow('Read error');
    });
  });

  describe('writeFileContent', () => {
    test('writes content to file', () => {
      const mockDir = '/test/dir';
      const mockPath = `${mockDir}/file.txt`;
      const mockContent = 'test content';

      path.dirname = jest.fn().mockReturnValue(mockDir);
      fs.existsSync = jest.fn().mockReturnValue(true); // Directory already exists
      fs.writeFileSync = jest.fn();

      Utils.writeFileContent(mockPath, mockContent);

      expect(path.dirname).toHaveBeenCalledWith(mockPath);
      expect(fs.existsSync).toHaveBeenCalledWith(mockDir);
      expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockContent, 'utf-8');
    });

    test('creates directory if it doesn\'t exist', () => {
      const mockDir = '/test/dir';
      const mockPath = `${mockDir}/file.txt`;
      const mockContent = 'test content';

      path.dirname = jest.fn().mockReturnValue(mockDir);
      fs.existsSync = jest.fn().mockReturnValue(false); // Directory doesn't exist
      fs.mkdirSync = jest.fn();
      fs.writeFileSync = jest.fn();

      Utils.writeFileContent(mockPath, mockContent);

      expect(path.dirname).toHaveBeenCalledWith(mockPath);
      expect(fs.existsSync).toHaveBeenCalledWith(mockDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockDir, { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(mockPath, mockContent, 'utf-8');
    });

    test('handles write errors', () => {
      const mockDir = '/test/dir';
      const mockPath = `${mockDir}/file.txt`;
      const mockContent = 'test content';

      path.dirname = jest.fn().mockReturnValue(mockDir);
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.writeFileSync = jest.fn().mockImplementation(() => {
        throw new Error('Write error');
      });

      expect(() => {
        Utils.writeFileContent(mockPath, mockContent);
      }).toThrow('Write error');
    });
  });

  describe('resolvePath', () => {
    test('resolves path relative to current working directory', () => {
      const mockPath = '/resolved/path';
      path.resolve = jest.fn().mockReturnValue(mockPath);

      const result = Utils.resolvePath('./relative/path');

      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), './relative/path');
      expect(result).toBe(mockPath);
    });
  });
});