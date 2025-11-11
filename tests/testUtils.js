// tests/testUtils.js
import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Create a temporary directory for test files
export const createTempDir = () => {
  const tempDir = path.join(os.tmpdir(), 'routerx-test-' + Date.now());
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
};

// Clean up temporary directory
export const cleanupTempDir = (tempDir) => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

// Create a mock Commander object
export const createMockCommander = () => {
  return {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    argument: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn(),
  };
};

// Mock environment variables
export const mockEnv = (envVars) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...envVars };
  return () => {
    process.env = originalEnv;
  };
};