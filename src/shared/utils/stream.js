import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { ensureDirectory, formatTimestamp, normalizePath } from './file.js';
import { LOG_MESSAGES } from '../constants/index.js';

/**
 * Handle streaming response data from API
 * @param {Object} response - The API response object with data stream
 * @param {Object} options - Options for handling the stream
 * @param {string} [options.save] - File path to save the response
 * @param {string} [options.prompt] - The original prompt for logging context
 */
export function handleStream(response, options = {}) {
  const { save, prompt } = options;
  let outputFile = null;

  // Setup file output if requested
  if (save) {
    const resolvedPath = normalizePath(save);
    const directory = path.dirname(resolvedPath);
    ensureDirectory(directory);
    outputFile = fs.createWriteStream(resolvedPath, { flags: 'a' });
    outputFile.write(`\n[${new Date().toISOString()}] Prompt: ${prompt}\n\n`);
  }

  return new Promise((resolve, reject) => {
    // Handle streaming response data
    response.data.on('data', (chunk) => {
      // Split chunk into individual lines (SSE format)
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        if (line.trim() === 'data: [DONE]') return; // Stop if stream is done
        if (line.startsWith('data:')) {
          try {
            // Parse the JSON response from Server-Sent Events
            const json = JSON.parse(line.replace('data: ', ''));
            const token = json.choices?.[0]?.delta?.content;
            if (token) {
              // Output the token to console and file if requested
              process.stdout.write(token);
              if (outputFile) outputFile.write(token);
            }
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }
      }
    });

    // Handle stream completion
    response.data.on('end', () => {
      if (outputFile) {
        // Close the output file and log completion
        outputFile.write(`\n\n[${new Date().toISOString()}] ✅ Stream complete.\n`);
        outputFile.end();
        console.log(chalk.dim(`\n\n${chalk.dim(formatTimestamp())} ${LOG_MESSAGES.STREAM_COMPLETE}. Saved to ${outputFile.path}\n`));
      } else {
        console.log(chalk.dim(`\n\n${chalk.dim(formatTimestamp())} ${LOG_MESSAGES.STREAM_COMPLETE}.\n`));
      }
      resolve();
    });

    // Handle stream errors
    response.data.on('error', (error) => {
      if (outputFile) {
        outputFile.end();
      }
      reject(error);
    });
  });
}
