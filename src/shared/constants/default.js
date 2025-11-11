// src/shared/constants/default.js
// Default values and keywords for RouterX application

export const DEFAULT_VALUES = {
  MODEL: 'openai/gpt-4o-mini',
  BASE_URL: 'https://openrouter.ai/api/v1',
  SAVE_PATH: './outputs',
  TIMEOUT: 30000,
  MAX_RETRIES: 3
};

export const FREE_MODEL_KEYWORDS = ['free', ':free', '-free', '/free'];
export const CODE_MODEL_KEYWORDS = ['coder', 'code', 'mistral', 'qwen', 'llama', 'gemma'];