// src/constants.js
// Constants for RouterX application

export const CLI_INFO = {
  NAME: 'RouterX',
  DESCRIPTION: 'A lightweight CLI for interacting with OpenRouter models',
  VERSION: '1.0.0'
};

export const ERROR_MESSAGES = {
  MISSING_API_KEY: '❌ Missing API key. Please set OPENAI_API_KEY or OPENROUTER_API_KEY.',
  MODEL_FETCH_ERROR: '❌ Failed to fetch model list',
  REQUEST_ERROR: '❌ Error processing request',
  NETWORK_ERROR: '❌ Network Error: Request failed to reach the server',
  FILE_NOT_FOUND: '❌ File does not exist'
};

export const LOG_MESSAGES = {
  SENDING_TO_MODEL: '🧠 Sending to model: ',
  API_BASE_URL: '🔗 API Base URL: ',
  PROMPT_INFO: '📝 Prompt: ',
  REPLY_STREAMING: '💬 Reply (streaming):\n',
  STREAM_COMPLETE: '✅ Stream complete.',
  FETCHING_MODELS: '📡 Fetching model list...',
  AVAILABLE_MODELS: '🧠 Available Models',
  NO_MODELS_FOUND: '⚠️ No models found matching your filters.',
  USING_MODEL: '🧠 Using model: ',
  CODE_MODE: '📝 Mode: ',
  REPLY_HEADER: '\n💬 Reply:\n',
  SAVED_TO_FILE: '💾 Saved to '
};

export const DEFAULT_VALUES = {
  MODEL: 'openai/gpt-4o-mini',
  BASE_URL: 'https://openrouter.ai/api/v1',
  SAVE_PATH: './outputs',
  TIMEOUT: 30000,
  MAX_RETRIES: 3
};

export const FREE_MODEL_KEYWORDS = ['free', ':free', '-free', '/free'];
export const CODE_MODEL_KEYWORDS = ['coder', 'code', 'mistral', 'qwen', 'llama', 'gemma'];