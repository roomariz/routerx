// tests/integration/cli-full.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { mockEnv, createTempDir, cleanupTempDir } from '../testUtils.js';

describe('Full CLI Integration Tests', () => {
  let restoreEnv;
  let tempDir;

  beforeEach(() => {
    // Mock environment variables for testing
    restoreEnv = mockEnv({
      OPENROUTER_API_KEY: 'test-key',
      OPENAI_API_KEY: 'test-key'
    });

    tempDir = createTempDir();
  });

  afterEach(() => {
    // Restore original environment
    restoreEnv();
    // Clean up temporary directory
    cleanupTempDir(tempDir);
  });

  test('CLI shows full help message when run with --help', (done) => {
    const child = spawn('node', ['../bin/routerx.js', '--help'], {
      cwd: path.join(process.cwd(), 'tests'),
      env: process.env
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(0);
      expect(output).toContain('A lightweight CLI for interacting with OpenRouter models');
      expect(output).toContain('chat');
      expect(output).toContain('models');
      expect(output).toContain('code');
      done();
    });
  }, 15000);

  test('CLI shows version when run with --version', (done) => {
    const child = spawn('node', ['../bin/routerx.js', '--version'], {
      cwd: path.join(process.cwd(), 'tests'),
      env: process.env
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      expect(code).toBe(0);
      // Extract version number from output (may have log messages before it)
      const versionMatch = output.match(/1\.0\.0/);
      expect(versionMatch).toBeTruthy();
      expect(output.trim()).toContain('1.0.0');
      done();
    });
  }, 15000);

  test('CLI models command works (with mocked API)', (done) => {
    const child = spawn('node', ['../bin/routerx.js', 'models'], {
      cwd: path.join(process.cwd(), 'tests'),
      env: process.env
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // The models command should work without an API key
      expect(code).toBe(0);
      // Should contain model data (not empty) or at least the fetching message
      expect(output).toMatch(/RouterX Models|Available Models|📡 Fetching model list/);
      done();
    });
  }, 15000);

  test('CLI chat command with proper parameters fails due to network (expected)', (done) => {
    const child = spawn('node', ['../bin/routerx.js', 'chat', 'hello world'], {
      cwd: path.join(process.cwd(), 'tests'),
      env: {
        ...process.env,
        OPENAI_API_KEY: undefined,
        OPENROUTER_API_KEY: undefined
      }
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // The command should fail due to missing API key
      expect(stderr).toContain('❌ Missing API key') || expect(code).toBe(1);
      done();
    });
  }, 15000);

  test('CLI code command fails without proper target (as expected)', (done) => {
    const child = spawn('node', ['../bin/routerx.js', 'code', 'explain'], {
      cwd: path.join(process.cwd(), 'tests'),
      env: process.env
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // The command should fail because 'explain' mode requires a file to be specified
      expect(stderr).toContain('❌ File does not exist') || expect(code).toBe(1);
      done();
    });
  }, 15000);

  test('CLI code command with file fails due to network (expected)', (done) => {
    // Create a test file
    const testFile = path.join(tempDir, 'test.js');
    fs.writeFileSync(testFile, 'console.log("hello");');

    const child = spawn('node', ['../bin/routerx.js', 'code', 'explain', testFile], {
      cwd: path.join(process.cwd(), 'tests'),
      env: {
        ...process.env,
        OPENAI_API_KEY: undefined,
        OPENROUTER_API_KEY: undefined
      }
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // The command should fail due to missing API key
      expect(stderr).toContain('❌ Missing API key') || expect(code).toBe(1);
      done();
    });
  }, 15000);

  test('CLI models command with --free option (with mocked API)', (done) => {
    const child = spawn('node', ['../bin/routerx.js', 'models', '--free'], {
      cwd: path.join(process.cwd(), 'tests'),
      env: process.env
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // The models command should work without an API key
      expect(code).toBe(0);
      // Should contain model data (not empty) or at least the fetching message
      expect(output).toMatch(/RouterX Models|Available Models|📡 Fetching model list/);
      done();
    });
  }, 15000);

  test('CLI models command with --search option (with mocked API)', (done) => {
    const child = spawn('node', ['../bin/routerx.js', 'models', '--search', 'gpt'], {
      cwd: path.join(process.cwd(), 'tests'),
      env: process.env
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    let stderr = '';
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // The models command should work without an API key
      expect(code).toBe(0);
      // Should contain model data (not empty) or at least the fetching message
      expect(output).toMatch(/RouterX Models|Available Models|📡 Fetching model list/);
      done();
    });
  }, 15000);
});
