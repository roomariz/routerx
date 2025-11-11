// src/cli/program.js
// Module that sets up the base Commander.js program instance with version and description

import { Command } from 'commander';

/**
 * Create and configure the main CLI program
 * @returns {import('commander').Command} Configured Commander program instance
 */
export function createProgram() {
  const program = new Command();

  program
    .name('routerx')
    .description('A lightweight CLI for interacting with OpenRouter models')
    .version('1.0.0');

  return program;
}