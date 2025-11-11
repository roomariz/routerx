// tests/integration/cli.test.js
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { spawn } from 'child_process';
import { mockEnv } from '../testUtils.js';

describe('CLI Integration Tests', () => {
  let restoreEnv;

  beforeEach(() => {
    // Mock environment variables for testing
    restoreEnv = mockEnv({
      OPENROUTER_API_KEY: 'test-key',
      OPENAI_API_KEY: 'test-key'
    });
  });

  afterEach(() => {
    // Restore original environment
    restoreEnv();
  });

  test('CLI shows help message when run with --help', (done) => {
    const child = spawn('node', ['index.js', '--help'], {
      cwd: process.cwd(),
      env: process.env
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(0);
      expect(output).toContain('A lightweight CLI for OpenRouter models');
      expect(output).toContain('chat');
      expect(output).toContain('models');
      expect(output).toContain('code');
      done();
    });
  });

  test('CLI shows error when run without API key', (done) => {
    // Temporarily clear API keys to test error handling
    const originalEnv = { ...process.env };
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const child = spawn('node', ['index.js', 'chat', 'test'], {
      cwd: process.cwd(),
      env: process.env
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(1);
      expect(stderr).toContain('Missing API key');
      
      // Restore environment
      process.env = originalEnv;
      done();
    });
  });
});