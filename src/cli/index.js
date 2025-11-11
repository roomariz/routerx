import './envLoader.js';
import { Command } from 'commander';
import chalk from 'chalk';
import { ERROR_MESSAGES, CLI_INFO } from '../constants.js';

// Initialize the CLI program using Commander.js
const program = new Command();

// Set program information
program
  .name(CLI_INFO.NAME.toLowerCase())
  .description(CLI_INFO.DESCRIPTION)
  .version(CLI_INFO.VERSION);

export default program;