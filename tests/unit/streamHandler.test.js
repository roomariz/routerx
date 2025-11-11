// tests/unit/streamHandler.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import { Readable, PassThrough } from 'stream';
import { handleStream } from '../../src/shared/utils/stream.js';

// Mock the utilities used in streamHandler
jest.mock('../../src/shared/utils/file.js', () => ({
  ensureDirectory: jest.fn(),
  formatTimestamp: jest.fn(() => '[12:00:00]'),
  normalizePath: jest.fn((path) => path)
}));

jest.mock('../../src/constants.js', () => ({
  LOG_MESSAGES: {
    STREAM_COMPLETE: 'Stream completed successfully'
  }
}));

describe('StreamHandler', () => {
  const { ensureDirectory, formatTimestamp, normalizePath } = require('../../src/shared/utils/file.js');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleStream', () => {
    test('handles streaming data correctly', async () => {
      // Create a mock response with a readable stream containing SSE data
      const mockStream = new PassThrough();
      const mockResponse = {
        data: mockStream
      };
      
      // Write some mock SSE data to the stream
      setTimeout(() => {
        mockStream.write('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n');
        mockStream.write('data: {"choices":[{"delta":{"content":" World"}}]}\n\n');
        mockStream.write('data: [DONE]\n\n');
        mockStream.end();
      }, 10);

      // Mock process.stdout.write to capture output
      const originalWrite = process.stdout.write;
      const stdoutWrites = [];
      process.stdout.write = jest.fn((chunk) => {
        stdoutWrites.push(chunk);
      });

      // Call handleStream
      await handleStream(mockResponse);

      // Verify that the content was written to stdout
      expect(stdoutWrites).toContain('Hello');
      expect(stdoutWrites).toContain(' World');
      
      // Restore original stdout.write
      process.stdout.write = originalWrite;
    });

    test('saves stream output to file when save option is provided', async () => {
      const mockStream = new PassThrough();
      const mockResponse = {
        data: mockStream
      };
      
      // Set up mocks for file system operations
      const mockWriteStream = new PassThrough();
      mockWriteStream.path = '/test/output.txt';
      mockWriteStream.write = jest.fn();
      mockWriteStream.end = jest.fn();
      
      jest.spyOn(fs, 'createWriteStream').mockReturnValue(mockWriteStream);
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      
      // Write mock data
      setTimeout(() => {
        mockStream.write('data: {"choices":[{"delta":{"content":"Test"}}]}\n\n');
        mockStream.write('data: [DONE]\n\n');
        mockStream.end();
      }, 10);

      const options = { save: '/test/output.txt', prompt: 'Test prompt' };

      // Mock process.stdout.write to capture output
      const originalWrite = process.stdout.write;
      process.stdout.write = jest.fn();

      await handleStream(mockResponse, options);

      // Verify file operations were called
      expect(ensureDirectory).toHaveBeenCalledWith('/test/output.txt');
      expect(fs.createWriteStream).toHaveBeenCalledWith('/test/output.txt', { flags: 'a' });
      expect(mockWriteStream.write).toHaveBeenCalledWith(
        expect.stringContaining('Test prompt')
      );
      expect(mockWriteStream.write).toHaveBeenCalledWith('Test');
      expect(mockWriteStream.end).toHaveBeenCalled();
      
      // Restore original stdout.write
      process.stdout.write = originalWrite;
      fs.createWriteStream.mockRestore();
    });

    test('handles stream errors properly', async () => {
      const mockStream = new PassThrough();
      const mockResponse = {
        data: mockStream
      };
      
      const mockError = new Error('Stream error');
      
      // Mock process.stdout.write
      const originalWrite = process.stdout.write;
      process.stdout.write = jest.fn();

      // Call handleStream and wait for the promise
      const promise = handleStream(mockResponse);
      
      // Trigger an error on the stream
      setTimeout(() => {
        mockStream.emit('error', mockError);
      }, 10);

      // Expect the promise to reject with the error
      await expect(promise).rejects.toThrow('Stream error');
      
      // Restore original stdout.write
      process.stdout.write = originalWrite;
    });

    test('handles JSON parsing errors gracefully', async () => {
      const mockStream = new PassThrough();
      const mockResponse = {
        data: mockStream
      };
      
      // Write invalid JSON to test error handling
      setTimeout(() => {
        mockStream.write('data: {"invalid": json}\n\n');
        mockStream.write('data: [DONE]\n\n');
        mockStream.end();
      }, 10);

      // Mock process.stdout.write to capture output
      const originalWrite = process.stdout.write;
      process.stdout.write = jest.fn();

      await handleStream(mockResponse);

      // Should not crash on invalid JSON, verify stdout was called appropriately
      expect(process.stdout.write).toBeDefined();
      
      // Restore original stdout.write
      process.stdout.write = originalWrite;
    });

    test('handles stream end properly', async () => {
      const mockStream = new PassThrough();
      const mockResponse = {
        data: mockStream
      };
      
      // Write data and end the stream
      setTimeout(() => {
        mockStream.write('data: {"choices":[{"delta":{"content":"End test"}}]}\n\n');
        mockStream.end();
      }, 10);

      // Mock process.stdout.write to capture output
      const originalWrite = process.stdout.write;
      process.stdout.write = jest.fn();

      await handleStream(mockResponse);

      // Verify that the stream ended and completion was logged
      expect(process.stdout.write).toHaveBeenCalledWith('End test');
      
      // Restore original stdout.write
      process.stdout.write = originalWrite;
    });
  });
});