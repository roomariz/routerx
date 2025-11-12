import fs from 'fs';
import chalk from 'chalk';
import path from 'path';
import { ApiClient } from '../../infrastructure/api/index.js';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig.js';
import { fileExists, readFileContent, writeFileContent, ensureDirectory } from '../../shared/utils/file.js';
import { ERROR_MESSAGES, LOG_MESSAGES, CODE_MODEL_KEYWORDS } from '../../shared/constants/index.js';
import { validateApiKey } from '../../shared/utils/auth.js';
import { handleError, handleAPIError, exitWithError } from '../../shared/utils/error.js';
import { createResiliencePolicy, resolveResilienceOverridesFromOptions } from '../../resilience/index.js';
import { logger as baseLogger } from '../../monitoring/logger.js';

const FREE_MODEL_PATTERN = /(:free|-free|\/free)/i;
const CONTEXT_MAX_ENTRIES = 40;
const CONTEXT_MAX_DEPTH = 2;
const CONTEXT_IGNORED_ENTRIES = new Set([
  '.git',
  '.next',
  '.turbo',
  'artifacts',
  'coverage',
  'dist',
  'build',
  'node_modules'
]);

function isModelFree(model = {}) {
  if (!model?.id) {
    return false;
  }

  if (FREE_MODEL_PATTERN.test(model.id)) {
    return true;
  }

  const pricing = model.pricing || {};
  return pricing.prompt === 0 || pricing.completion === 0;
}

function persistReply(saveOption, reply, config, commandLogger, traceId) {
  if (!saveOption) {
    return;
  }

  let savePath = saveOption;
  if (!savePath.includes('/') && !savePath.includes('\\')) {
    savePath = path.join(config.defaultSavePath, savePath);
  }

  ensureDirectory(path.dirname(savePath));
  writeFileContent(savePath, reply);
  console.log(chalk.dim(`\n${LOG_MESSAGES.SAVED_TO_FILE}${savePath}`));
  commandLogger.debug('Code command output saved', { savePath, traceId });
}

function resolveContextDirectory(optionValue) {
  if (optionValue === undefined) {
    return null;
  }

  const candidate = optionValue === true || optionValue === '' ? process.cwd() : optionValue;
  const resolved = path.resolve(candidate);

  try {
    const stats = fs.statSync(resolved);
    if (!stats.isDirectory()) {
      exitWithError(`${ERROR_MESSAGES.INVALID_CONTEXT_DIRECTORY}: ${candidate}`);
    }
  } catch {
    exitWithError(`${ERROR_MESSAGES.INVALID_CONTEXT_DIRECTORY}: ${candidate}`);
  }

  return resolved;
}

function collectContextEntries(rootDir, maxEntries = CONTEXT_MAX_ENTRIES, maxDepth = CONTEXT_MAX_DEPTH) {
  const results = [];

  function walk(currentDir, depth) {
    if (depth > maxDepth || results.length >= maxEntries) {
      return;
    }

    let dirEntries = [];
    try {
      dirEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    dirEntries
      .filter((entry) => !CONTEXT_IGNORED_ENTRIES.has(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((entry) => {
        if (results.length >= maxEntries) {
          return;
        }

        const absolute = path.join(currentDir, entry.name);
        const relative = path.relative(rootDir, absolute) || entry.name;
        results.push({
          depth,
          relativePath: relative,
          isDirectory: entry.isDirectory()
        });

        if (entry.isDirectory()) {
          walk(absolute, depth + 1);
        }
      });
  }

  walk(rootDir, 0);
  return results;
}

function formatContextHeadingLabel(resolvedDir) {
  const relative = path.relative(process.cwd(), resolvedDir);
  return relative && relative !== '' ? relative : resolvedDir;
}

function buildContextSummary(resolvedDir) {
  const entries = collectContextEntries(resolvedDir);
  const label = formatContextHeadingLabel(resolvedDir);

  if (entries.length === 0) {
    return `Context Directory (${label}): (empty)`;
  }

  const lines = entries.map(({ depth, relativePath, isDirectory }) => {
    const indent = '  '.repeat(depth);
    const suffix = isDirectory ? '/' : '';
    return `${indent}- ${relativePath}${suffix}`;
  });

  return `Context Directory (${label}):\n${lines.join('\n')}`;
}

async function getOrderedFreeModels(apiClient, baseUrl, preferKeyword) {
  const response = await apiClient.fetchModels(baseUrl);
  const models = Array.isArray(response?.data?.data) ? response.data.data : [];
  const freeModels = models.filter(isModelFree).map((model) => model.id);

  if (freeModels.length === 0) {
    return [];
  }

  const normalizedPrefer = typeof preferKeyword === 'string' ? preferKeyword.toLowerCase() : null;
  const seen = new Set();
  const ordered = [];

  if (normalizedPrefer) {
    freeModels
      .filter((id) => id.toLowerCase().includes(normalizedPrefer))
      .forEach((id) => {
        if (!seen.has(id)) {
          ordered.push(id);
          seen.add(id);
        }
      });
  }

  freeModels.forEach((id) => {
    const lowered = id.toLowerCase();
    if (
      !seen.has(id) &&
      CODE_MODEL_KEYWORDS.some((keyword) => lowered.includes(keyword.toLowerCase()))
    ) {
      ordered.push(id);
      seen.add(id);
    }
  });

  freeModels.forEach((id) => {
    if (!seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  });

  return ordered;
}

async function attemptFreeModelFlow({
  apiClient,
  baseUrl,
  apiKey,
  prompt,
  config,
  options,
  commandLogger,
  traceId,
  excludeModels = new Set()
}) {
  let orderedModels;
  try {
    orderedModels = await getOrderedFreeModels(apiClient, baseUrl, options.prefer);
  } catch (error) {
    const handled = handleAPIError(error);
    console.error('❌ Unable to fetch models for free-mode execution:', handled.message);
    commandLogger.error('Failed to retrieve models for free-mode execution', {
      error,
      traceId
    });
    return false;
  }

  const availableModels = orderedModels.filter((id) => !excludeModels.has(id));
  if (availableModels.length === 0) {
    console.error(ERROR_MESSAGES.NO_FREE_MODELS_AVAILABLE);
    return false;
  }

  for (const candidate of availableModels) {
    excludeModels.add(candidate);
    try {
      const res = await apiClient.makeGeneralChat(apiKey, candidate, prompt, baseUrl);
      const reply = res.data?.choices?.[0]?.message?.content || '(no reply)';
      console.log(chalk.green('\n💬 Reply:\n') + reply);
      commandLogger.info('Code command free-model execution succeeded', {
        fallbackModel: candidate,
        traceId
      });
      persistReply(options.save, reply, config, commandLogger, traceId);
      return true;
    } catch (error) {
      const handled = handleAPIError(error);
      if (error.response?.status === 429) {
        console.log(chalk.yellow('⚠️ Free model is rate-limited. Trying another candidate...\n'));
        commandLogger.warn('Free model rate limited', {
          fallbackModel: candidate,
          traceId
        });
        continue;
      }

      console.error(`❌ Free model ${candidate} failed:`, handled.message);
      commandLogger.error('Free model attempt failed', {
        fallbackModel: candidate,
        error,
        traceId
      });
    }
  }

  console.error('❌ Unable to complete request using available free models.');
  return false;
}

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
export async function handleCodeCommand(mode, target, options, context = {}) {
  const config = getRuntimeConfig();
  const { logger: commandLogger = baseLogger, traceId } = context;
  const commandTargets = Array.isArray(target) ? target : [];

  // Validate API key exists
  const apiKey = validateApiKey();
  if (!apiKey) {
    exitWithError(ERROR_MESSAGES.MISSING_API_KEY);
  }

  const resilienceOverrides = resolveResilienceOverridesFromOptions(options);
  if (Object.keys(resilienceOverrides).length > 0) {
    commandLogger.info('Applying resilience overrides for code command', {
      overrides: resilienceOverrides,
      traceId
    });
  }

  const resiliencePolicy = createResiliencePolicy(config, resilienceOverrides);
  const apiClientLogger = commandLogger.child({ component: 'ApiClient' });
  const apiClient = new ApiClient(config, { resiliencePolicy, logger: apiClientLogger });

  const baseUrl = config.defaultBaseUrl;
  const modeLower = (mode || 'generate').toLowerCase();

  // Build the appropriate prompt based on mode and target
  let prompt = '';
  if (['explain', 'fix', 'review', 'diff'].includes(modeLower)) {
    if (commandTargets.length === 0) {
      exitWithError(ERROR_MESSAGES.FILE_NOT_FOUND);
    }

    for (const f of commandTargets) {
      if (!fileExists(f)) {
        exitWithError(ERROR_MESSAGES.FILE_NOT_FOUND);
      }
    }

    const files = commandTargets.map((f) => ({
      name: f,
      content: readFileContent(f)
    }));

    if (modeLower === 'diff' && files.length === 2) {
      prompt = `Compare and summarise key differences:\n\n--- ${files[0].name} ---\n${files[0].content}\n\n--- ${files[1].name} ---\n${files[1].content}`;
    } else if (modeLower === 'fix') {
      prompt = `Fix and improve the following code. Return the corrected version only:\n\n${files.map((f) => f.content).join('\n\n')}`;
    } else if (modeLower === 'review') {
      prompt = `Perform a detailed code review:\n\n${files.map((f) => f.content).join('\n\n')}`;
    } else {
      prompt = `Explain what this code does:\n\n${files.map((f) => f.content).join('\n\n')}`;
    }
  } else {
    prompt = commandTargets.join(' ') || 'Write example code in Python';
  }

  const contextDirectory = resolveContextDirectory(options.context);
  if (contextDirectory) {
    const summary = buildContextSummary(contextDirectory);
    prompt = `${summary}\n\n${prompt}`;
  }

  const useFreeOnly = Boolean(options.free);
  const attemptedModels = new Set();
  let model = options.model || config.defaultModel;

  if (useFreeOnly) {
    commandLogger.info('Free-only mode enabled for code command', { traceId });
  }

  if (useFreeOnly && !options.model) {
    try {
      const freeCandidates = await getOrderedFreeModels(apiClient, baseUrl, options.prefer);
      if (freeCandidates.length === 0) {
        exitWithError(ERROR_MESSAGES.NO_FREE_MODELS_AVAILABLE);
      }
      model = freeCandidates[0];
      console.log(chalk.cyan('🧠 Using free model:'), chalk.yellow(model));
    } catch (error) {
      const handled = handleAPIError(error);
      commandLogger.error('Unable to resolve free model before execution', {
        error,
        traceId
      });
      handleError(handled, 'MODEL_FETCH_ERROR', {
        operation: 'handleCodeCommand',
        traceId
      });
      return;
    }
  }

  attemptedModels.add(model);

  console.log(chalk.cyan(LOG_MESSAGES.USING_MODEL), chalk.yellow(model));
  console.log(chalk.blue(LOG_MESSAGES.CODE_MODE), modeLower, '\n');
  commandLogger.info('Executing code command', {
    mode: modeLower,
    model,
    baseUrl,
    traceId
  });

  try {
    const res = await apiClient.makeGeneralChat(apiKey, model, prompt, baseUrl);
    const reply = res.data?.choices?.[0]?.message?.content || '(no reply)';
    console.log(chalk.green(LOG_MESSAGES.REPLY_HEADER) + reply);
    commandLogger.info('Code command completed', { model, mode: modeLower, traceId });
    persistReply(options.save, reply, config, commandLogger, traceId);
  } catch (err) {
    const handledError = handleAPIError(err);
    const shouldFallbackToFree = useFreeOnly || err.response?.status === 402;

    if (!useFreeOnly && err.response?.status === 402) {
      console.log(chalk.yellow('💰 Model requires more credits. Searching for best free model...\n'));
    } else if (useFreeOnly) {
      console.log(chalk.yellow('⚠️ Free model failed, trying alternate free models...\n'));
    }

    if (shouldFallbackToFree) {
      const success = await attemptFreeModelFlow({
        apiClient,
        baseUrl,
        apiKey,
        prompt,
        config,
        options,
        commandLogger,
        traceId,
        excludeModels: attemptedModels
      });

      if (success) {
        return;
      }
    }

    commandLogger.error('Code command failed', {
      error: handledError,
      mode: modeLower,
      traceId
    });
    handleError(handledError, 'REQUEST_ERROR', {
      operation: 'handleCodeCommand',
      mode: modeLower,
      target: commandTargets,
      options,
      traceId
    });
  }
}
