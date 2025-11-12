// src/cli/bootstrap.js
// Main CLI initialization that loads environment variables, creates Commander instance, registers commands and parses input

import '../infrastructure/env/envLoader.js';
import { bootstrap } from '../core/bootstrap.js';
import { createProgram } from './program.js';
import { setupCLI } from '../core/index.js';

// Bootstrap the application with global error handlers
const bootstrapResult = bootstrap();
if (!bootstrapResult.success) {
  console.error('Failed to bootstrap application:', bootstrapResult.message);
  process.exit(1);
}

// Initialize the CLI program using Commander.js
const program = createProgram();

// Setup all commands
setupCLI(program);

// Parse and execute the command
program.parse();