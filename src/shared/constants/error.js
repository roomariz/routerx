// src/shared/constants/error.js
// Error message constants for RouterX application

export const ERROR_MESSAGES = {
  MISSING_API_KEY: '❌ Missing API key. Please set OPENAI_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY.',
  MODEL_FETCH_ERROR: '❌ Failed to fetch model list',
  REQUEST_ERROR: '❌ Error processing request',
  NETWORK_ERROR: '❌ Network Error: Request failed to reach the server',
  FILE_NOT_FOUND: '❌ File does not exist',
  HEALTH_CHECK_FAILED: '❌ Health check failed',
  INVALID_CONTEXT_DIRECTORY: '❌ Context directory not found or inaccessible',
  NO_FREE_MODELS_AVAILABLE: '❌ No free models are available from the API response'
};
