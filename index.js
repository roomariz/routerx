#!/usr/bin/env node
/**
 * RouterX - A lightweight CLI for interacting with OpenRouter models
 *
 * This CLI provides chat capabilities, model listing, and code assistance
 * using various AI models through the OpenRouter API.
 *
 * Features:
 * - Chat interface with streaming responses
 * - Code assistance (generate, explain, fix, review, diff)
 * - Model discovery and filtering
 * - File output functionality
 * - Configurable settings via config file
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import ApiClient from './src/api/api.js';
import ConfigManager from './src/config/config.js';
import Utils from './src/utils/index.js';
import { ERROR_MESSAGES, LOG_MESSAGES, DEFAULT_VALUES } from './src/constants.js';

// Initialize the CLI program using Commander.js
const program = new Command();

// Initialize configuration manager and load config
const configManager = new ConfigManager();
const config = configManager.loadConfig();

// Initialize API client with config
const apiClient = new ApiClient(config);

// Set program information
program
  .name('routerx')
  .description('A lightweight CLI for interacting with OpenRouter models')
  .version('1.0.0');

// -----------------------------------------------------
// 🔹 Command: Run a chat completion
// Handles general chat requests with AI models
// -----------------------------------------------------
program
  .command('chat')
  .argument('<prompt>', 'Prompt to send to the model')
  .option('--model <model>', `Specify model name (default: ${config.defaultModel})`)
  .option('--base-url <url>', `Override API base URL (default: ${config.defaultBaseUrl})`)
  .option('--save <file>', 'Save the streamed reply to a text file')
  .action(async (prompt, options) => {
    // Validate API key exists
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error(ERROR_MESSAGES.MISSING_API_KEY);
      process.exit(1);
    }

    // Set default values for model and base URL from config
    const model = options.model || config.defaultModel;
    const baseUrl = options.baseUrl || config.defaultBaseUrl;

    // Log the request details
    console.log(`${chalk.dim(Utils.formatTimestamp())} ${LOG_MESSAGES.SENDING_TO_MODEL}${chalk.yellow(model)}`);
    console.log(`${chalk.dim(Utils.formatTimestamp())} ${chalk.dim(LOG_MESSAGES.API_BASE_URL)}${baseUrl}`);
    console.log(`${chalk.dim(Utils.formatTimestamp())} ${LOG_MESSAGES.PROMPT_INFO}"${prompt}"`);
    console.log(`${chalk.dim(Utils.formatTimestamp())} ${LOG_MESSAGES.REPLY_STREAMING}`);

    // Setup file output if requested
    let outputFile = null;
    if (options.save) {
      const dir = Utils.normalizePath(options.save);
      Utils.ensureDirectory(dir);
      outputFile = fs.createWriteStream(options.save, { flags: 'a' });
      outputFile.write(`\n[${new Date().toISOString()}] Prompt: ${prompt}\n\n`);
    }

    try {
      // Make the API request with streaming response
      const response = await apiClient.makeChatCompletion(apiKey, model, prompt, baseUrl);

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
          console.log(chalk.dim(`\n\n${chalk.dim(Utils.formatTimestamp())} ${LOG_MESSAGES.STREAM_COMPLETE}. Saved to ${options.save}\n`));
        } else {
          console.log(chalk.dim(`\n\n${chalk.dim(Utils.formatTimestamp())} ${LOG_MESSAGES.STREAM_COMPLETE}.\n`));
        }
      });
    } catch (err) {
      // Handle any errors from the API request
      console.error(ERROR_MESSAGES.REQUEST_ERROR, err.message);
    }
  });

// -----------------------------------------------------
// 🔹 Command: List models (free + paid)
// Provides a way to discover available AI models
// -----------------------------------------------------
program
  .command('models')
  .description('List available models (free, paid, or filtered by search keyword)')
  .option('--free', 'Show only free models')
  .option('--search <keyword>', 'Filter models by keyword (e.g. mistral, vision, llama)')
  .action(async (options) => {
    const baseUrl = config.defaultBaseUrl; // Use base URL from config

    try {
      console.log(LOG_MESSAGES.FETCHING_MODELS);
      const res = await apiClient.fetchModels(baseUrl);
      const models = res.data.data || [];

      // Apply filters based on options
      let filtered = models.filter((m) => m.id);

      // Filter by free models if requested
      if (options.free) {
        filtered = filtered.filter(
          (m) =>
            /(:free|-free|\/free)/i.test(m.id) ||  // Check for free suffix/prefix
            m.pricing?.prompt === 0 ||             // Check for free pricing
            m.pricing?.completion === 0
        );
      }

      // Filter by search keyword if provided
      if (options.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter((m) => m.id.toLowerCase().includes(q));
      }

      // Handle case where no models match the filters
      if (filtered.length === 0) {
        console.log(ERROR_MESSAGES.NO_MODELS_FOUND);
        return;
      }

      // Display the available models
      console.log(
        `\n${LOG_MESSAGES.AVAILABLE_MODELS}${options.free ? ' Free ' : ''}${options.search ? ` matching '${options.search}'` : ''}:\n`
      );
      for (const model of filtered) {
        // Determine if the model is free or paid
        const status =
          /(:free|-free|\/free)/i.test(model.id) ||
            model.pricing?.prompt === 0 ||
            model.pricing?.completion === 0
            ? 'Free'
            : 'Paid';
        console.log(`• ${model.id.padEnd(45)} | ${status}`);
      }
    } catch (err) {
      console.error(ERROR_MESSAGES.MODEL_FETCH_ERROR, err.message);
    }
  });

// -----------------------------------------------------
// 🔹 Enhanced Command: Code Assistant (Claude / Codex style)
// Provides specialized code-related assistance
// -----------------------------------------------------
program
  .command('code')
  .description('AI code assistant (generate, explain, fix, review, diff)')
  .argument('[mode]', `Mode: generate | explain | fix | review | diff (default: generate)`)
  .argument('[target...]', 'Code file(s) or prompt')
  .option('--model <model>', `Force specific model ID (default: ${config.defaultModel})`)
  .option('--save <path>', 'Save output to file')
  .option('--context <dir>', 'Add folder context (default current dir)')
  .option('--free', 'Force only free model fallback')
  .option('--prefer <keyword>', 'Bias fallback model selection (e.g. coder, mistral, llama, qwen)')
  .action(async (mode, target, options) => {
    // Validate API key exists
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error(ERROR_MESSAGES.MISSING_API_KEY);
      process.exit(1);
    }

    const baseUrl = config.defaultBaseUrl; // Use base URL from config

    // Normalize the mode to lowercase for consistent handling
    const modeLower = (mode || 'generate').toLowerCase();

    // Build the appropriate prompt based on mode and target
    let prompt = '';
    if (['explain', 'fix', 'review', 'diff'].includes(modeLower) && target.length) {
      // Read content from specified files if they exist
      const files = target.map((f) => ({
        name: f,
        content: Utils.fileExists(f) ? Utils.readFileContent(f) : '',
      }));

      // Construct prompt based on the mode
      if (modeLower === 'diff' && files.length === 2) {
        // Compare two files
        prompt = `Compare and summarise key differences:\n\n--- ${files[0].name} ---\n${files[0].content}\n\n--- ${files[1].name} ---\n${files[1].content}`;
      } else if (modeLower === 'fix') {
        // Fix the provided code
        prompt = `Fix and improve the following code. Return the corrected version only:\n\n${files.map(f => f.content).join('\n\n')}`;
      } else if (modeLower === 'review') {
        // Review the provided code
        prompt = `Perform a detailed code review:\n\n${files.map(f => f.content).join('\n\n')}`;
      } else {
        // Explain the provided code
        prompt = `Explain what this code does:\n\n${files.map(f => f.content).join('\n\n')}`;
      }
    } else {
      // If no target files provided, treat the target as the prompt
      prompt = target.join(' ') || 'Write example code in Python';
    }

    // Use the specified model or default
    const model = options.model || config.defaultModel;

    // Log the action details
    console.log(chalk.cyan(LOG_MESSAGES.USING_MODEL), chalk.yellow(model));
    console.log(chalk.blue(LOG_MESSAGES.CODE_MODE), modeLower, '\n');

    try {
      // Make the API request
      const res = await apiClient.makeGeneralChat(apiKey, model, prompt, baseUrl);

      // Extract and display the response
      const reply = res.data?.choices?.[0]?.message?.content || '(no reply)';
      console.log(chalk.green(LOG_MESSAGES.REPLY_HEADER) + reply);

      // Save to file if requested
      if (options.save) {
        // If save path doesn't include a directory, prepend the default save path
        let savePath = options.save;
        if (!savePath.includes('/') && !savePath.includes('\\')) {
          savePath = path.join(config.defaultSavePath, savePath);
        }

        Utils.ensureDirectory(path.dirname(savePath));
        Utils.writeFileContent(savePath, reply);
        console.log(chalk.dim(`\n${LOG_MESSAGES.SAVED_TO_FILE}${savePath}`));
      }
    } catch (err) {
      // Handle payment required error (402) and try fallback models
      if (err.response?.status === 402 && !options.free) {
        console.log(chalk.yellow('💰 Model requires more credits. Searching for best free model...\n'));
        try {
          // Fetch available models
          const resList = await apiClient.fetchModels(baseUrl);
          const freeModels = resList.data.data
            .map((m) => m.id)
            .filter((id) => /(:free|-free|\/free)/i.test(id));

          let fallback = config.defaultModel; // Use configured default

          // If user specified a preferred model type, try to find a match
          if (options.prefer) {
            const prefer = options.prefer.toLowerCase();
            const match = freeModels.find((id) => id.toLowerCase().includes(prefer));
            if (match) {
              fallback = match;
              console.log(chalk.cyan(`🧠 Using preferred free model:`), chalk.yellow(fallback));
            } else {
              console.log(chalk.yellow(`⚠️ No free models matched preference '${options.prefer}', using default fallback.`));
            }
          } else {
            // Otherwise, try to find coding-specific models
            const codingPreference = freeModels.find((id) =>
              /(coder|code|mistral|qwen|llama)/i.test(id)
            );
            if (codingPreference) fallback = codingPreference;
            console.log(chalk.cyan(`🧠 Selected free model:`), chalk.yellow(fallback));
          }

          // Try with the fallback model
          const res2 = await apiClient.makeGeneralChat(apiKey, fallback, prompt, baseUrl);

          const reply2 = res2.data?.choices?.[0]?.message?.content || '(no reply)';
          console.log(chalk.green('\n💬 Reply:\n') + reply2);
          if (options.save) {
            // If save path doesn't include a directory, prepend the default save path
            let savePath = options.save;
            if (!savePath.includes('/') && !savePath.includes('\\')) {
              savePath = path.join(config.defaultSavePath, savePath);
            }

            Utils.ensureDirectory(path.dirname(savePath));
            Utils.writeFileContent(savePath, reply2);
            console.log(chalk.dim(`\n${LOG_MESSAGES.SAVED_TO_FILE}${savePath}`));
          }
        } catch (fallbackErr) {
          // Handle rate limiting errors (429) with another fallback
          if (fallbackErr.response?.status === 429) {
            console.log(chalk.yellow('⚠️ Preferred free model is rate-limited. Trying next available free model...\n'));
            try {
              // Fetch models again for second fallback attempt
              const resList2 = await apiClient.fetchModels(baseUrl);
              const freeModels2 = resList2.data.data
                .map((m) => m.id)
                .filter((id) => /(:free|-free|\/free)/i.test(id));

              // Find a different coding-capable model that wasn't tried before
              const nextFree = freeModels2.find((id) =>
                id !== fallback && /(coder|code|mistral|qwen|llama|gemma)/i.test(id)
              ) || config.defaultModel; // Use configured default as fallback

              console.log(chalk.cyan(`🧠 Retrying with alternate model:`), chalk.yellow(nextFree));

              // Try with the second fallback model
              const res3 = await apiClient.makeGeneralChat(apiKey, nextFree, prompt, baseUrl);

              const reply3 = res3.data?.choices?.[0]?.message?.content || '(no reply)';
              console.log(chalk.green('\n💬 Reply:\n') + reply3);
              if (options.save) {
                // If save path doesn't include a directory, prepend the default save path
                let savePath = options.save;
                if (!savePath.includes('/') && !savePath.includes('\\')) {
                  savePath = path.join(config.defaultSavePath, savePath);
                }

                Utils.ensureDirectory(path.dirname(savePath));
                Utils.writeFileContent(savePath, reply3);
                console.log(chalk.dim(`\n${LOG_MESSAGES.SAVED_TO_FILE}${savePath}`));
              }
            } catch (nextErr) {
              console.error('❌ Alternate fallback also failed:', nextErr.message);
            }
          } else {
            console.error('❌ Fallback model also failed:', fallbackErr.message);
          }
          return;
        }

        return;
      }

      // If it wasn't a payment error, re-throw the original error
      console.error(ERROR_MESSAGES.REQUEST_ERROR, err.message);
    }
  });

// Parse and execute the command
program.parse();