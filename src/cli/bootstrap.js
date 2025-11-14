// src/cli/bootstrap.js
// Main CLI initialization that loads environment variables, creates Commander instance, registers commands and parses input

import '../infrastructure/env/envLoader.js';
import { bootstrap } from '../core/bootstrap.js';
import { createProgram } from './program.js';
import { setupCLI } from '../core/index.js';
import { loadRuntimeConfig } from '../infrastructure/config/runtimeConfig.js';
import { initializeCliSession } from './state/session.js';
import { configureCliLogging } from './ui/loggerControl.js';
import { renderStartupBanner } from './ui/banner.js';

// Bootstrap the application with global error handlers
const bootstrapResult = bootstrap();
if (!bootstrapResult.success) {
  console.error('Failed to bootstrap application:', bootstrapResult.message);
  process.exit(1);
}

const argvFlags = process.argv.slice(2);
const verboseRequested = argvFlags.some((flag) => flag === '--verbose' || flag === '-v');
initializeCliSession({ verbose: verboseRequested });
configureCliLogging({ verbose: verboseRequested });

// Validate configuration up front so operators see failures immediately
try {
  loadRuntimeConfig();
} catch (error) {
  handleStartupConfigurationError(error);
}

// Initialize the CLI program using Commander.js
const program = createProgram();

// Setup all commands
setupCLI(program);
renderStartupBanner();

// Show help when no command is provided so Commander can still enforce unknown commands
if (process.argv.length <= 2) {
  program.help({ error: false });
}

// Parse and execute the command
program.parse();

function handleStartupConfigurationError(error) {
  if (error?.code !== 'CONFIG_VALIDATION_ERROR') {
    console.error('Failed to load configuration:', error?.message || 'Unknown error');
    process.exit(1);
  }

  console.error('\nConfiguration validation failed. RouterX cannot start until the issues are fixed.');
  if (error?.context?.configPath) {
    console.error(`File: ${error.context.configPath}`);
  }

  const validationErrors = Array.isArray(error?.context?.errors) ? error.context.errors : [];
  if (validationErrors.length > 0) {
    validationErrors.forEach((message, index) => {
      console.error(`  ${index + 1}. ${message}`);
    });
  } else if (error?.message) {
    console.error(`  - ${error.message}`);
  }

  console.error('\nUpdate the configuration file (or remove it to fall back to defaults) and rerun the CLI.\n');
  process.exit(1);
}
