// src/cli/bootstrap.js
// Main CLI initialization that loads environment variables, creates Commander instance, registers commands and parses input

import '../infrastructure/env/envLoader.js';
import { createProgram } from './program.js';
import { setupCLI } from '../core/index.js';

// Initialize the CLI program using Commander.js
const program = createProgram();

// Setup all commands
setupCLI(program);

// Parse and execute the command
program.parse();