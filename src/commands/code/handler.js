import chalk from 'chalk';
import path from 'path';
import { ApiClient } from '../../infrastructure/api/index.js';
import { ConfigManager } from '../../infrastructure/config/index.js';
import { fileExists, readFileContent, writeFileContent, ensureDirectory, resolvePath } from '../../shared/utils/file.js';
import { ERROR_MESSAGES, LOG_MESSAGES, DEFAULT_VALUES, FREE_MODEL_KEYWORDS, CODE_MODEL_KEYWORDS } from '../../shared/constants/index.js';
import { validateApiKey } from '../../shared/utils/auth.js';
import { handleError, handleAPIError, exitWithError } from '../../shared/utils/error.js';

// Initialize configuration manager and load config
const configManager = new ConfigManager();
const config = configManager.loadConfig();



/**
 * Handle the code command action
 * @param {string} [mode] - The code mode (generate, explain, fix, review, diff)
 * @param {string[]} [target] - Target files or prompt
 * @param {Object} options - Command options
 * @param {string} [options.model] - Model to use
 * @param {string} [options.save] - Path to save output
 * @param {string} [options.context] - Context directory
 * @param {boolean} [options.free] - Whether to use free models only
 * @param {string} [options.prefer] - Preferred model keyword
 */
export async function handleCodeCommand(mode, target, options) {
  // Validate API key exists
  const apiKey = validateApiKey();
  if (!apiKey) {
    exitWithError(ERROR_MESSAGES.MISSING_API_KEY);
  }

  const baseUrl = config.defaultBaseUrl; // Use base URL from config

  // Normalize the mode to lowercase for consistent handling
  const modeLower = (mode || 'generate').toLowerCase();

  // Build the appropriate prompt based on mode and target
  let prompt = '';
  if (['explain', 'fix', 'review', 'diff'].includes(modeLower)) {
    if (target.length === 0) {
      // These modes require files to be specified
      exitWithError(ERROR_MESSAGES.FILE_NOT_FOUND);
    }

    // Validate that specified files actually exist
    for (const f of target) {
      if (!fileExists(f)) {
        exitWithError(ERROR_MESSAGES.FILE_NOT_FOUND);
      }
    }

    // Read content from specified files
    const files = target.map((f) => ({
      name: f,
      content: readFileContent(f),
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
    // Initialize API client with config for this request
    const apiClientInstance = new ApiClient(config);
    
    // Make the API request
    const res = await apiClientInstance.makeGeneralChat(apiKey, model, prompt, baseUrl);

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

      ensureDirectory(path.dirname(savePath));
      writeFileContent(savePath, reply);
      console.log(chalk.dim(`\n${LOG_MESSAGES.SAVED_TO_FILE}${savePath}`));
    }
  } catch (err) {
    const handledError = handleAPIError(err);

    // Handle payment required error (402) and try fallback models
    if (err.response?.status === 402 && !options.free) {
      console.log(chalk.yellow('💰 Model requires more credits. Searching for best free model...\n'));
      let fallback = config.defaultModel; // Declare outside try block for access in catch
      try {
        // Initialize a new API client for fallback operations
        const fallbackApiClient = new ApiClient(config);
        
        // Fetch available models
        const resList = await fallbackApiClient.fetchModels(baseUrl);
        const freeModels = resList.data.data
          .map((m) => m.id)
          .filter((id) => /(:free|-free|\/free)/i.test(id));

        fallback = config.defaultModel; // Use configured default

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
            CODE_MODEL_KEYWORDS.some(keyword => id.toLowerCase().includes(keyword.toLowerCase()))
          );
          if (codingPreference) fallback = codingPreference;
          console.log(chalk.cyan(`🧠 Selected free model:`), chalk.yellow(fallback));
        }

        // Try with the fallback model
        const res2 = await fallbackApiClient.makeGeneralChat(apiKey, fallback, prompt, baseUrl);

        const reply2 = res2.data?.choices?.[0]?.message?.content || '(no reply)';
        console.log(chalk.green('\n💬 Reply:\n') + reply2);
        if (options.save) {
          // If save path doesn't include a directory, prepend the default save path
          let savePath = options.save;
          if (!savePath.includes('/') && !savePath.includes('\\')) {
            savePath = path.join(config.defaultSavePath, savePath);
          }

          ensureDirectory(path.dirname(savePath));
          writeFileContent(savePath, reply2);
          console.log(chalk.dim(`\n${LOG_MESSAGES.SAVED_TO_FILE}${savePath}`));
        }
        return; // Early return after successful fallback
      } catch (fallbackErr) {
        const handledFallbackError = handleAPIError(fallbackErr);

        // Handle rate limiting errors (429) with another fallback
        if (fallbackErr.response?.status === 429) {
          console.log(chalk.yellow('⚠️ Preferred free model is rate-limited. Trying next available free model...\n'));
          try {
            // Initialize a new API client for alternate fallback operations
            const alternateApiClient = new ApiClient(config);
            
            // Fetch models again for second fallback attempt
            const resList2 = await alternateApiClient.fetchModels(baseUrl);
            const freeModels2 = resList2.data.data
              .map((m) => m.id)
              .filter((id) => /(:free|-free|\/free)/i.test(id));

            // Find a different coding-capable model that wasn't tried before
            const nextFree = freeModels2.find((id) =>
              id !== fallback && CODE_MODEL_KEYWORDS.some(keyword => id.toLowerCase().includes(keyword.toLowerCase()))
            ) || config.defaultModel; // Use configured default as fallback

            console.log(chalk.cyan(`🧠 Retrying with alternate model:`), chalk.yellow(nextFree));

            // Try with the second fallback model
            const res3 = await alternateApiClient.makeGeneralChat(apiKey, nextFree, prompt, baseUrl);

            const reply3 = res3.data?.choices?.[0]?.message?.content || '(no reply)';
            console.log(chalk.green('\n💬 Reply:\n') + reply3);
            if (options.save) {
              // If save path doesn't include a directory, prepend the default save path
              let savePath = options.save;
              if (!savePath.includes('/') && !savePath.includes('\\')) {
                savePath = path.join(config.defaultSavePath, savePath);
              }

              ensureDirectory(path.dirname(savePath));
              writeFileContent(savePath, reply3);
              console.log(chalk.dim(`\n${LOG_MESSAGES.SAVED_TO_FILE}${savePath}`));
            }
            return; // Early return after successful alternate fallback
          } catch (nextErr) {
            const handledNextError = handleAPIError(nextErr);
            console.error('❌ Alternate fallback also failed:', handledNextError.message);
          }
        } else {
          console.error('❌ Fallback model also failed:', handledFallbackError.message);
        }
        return;
      }

      return;
    }

    // If it wasn't a payment error, re-throw the original error
    handleError(handledError, 'REQUEST_ERROR');
  }
}