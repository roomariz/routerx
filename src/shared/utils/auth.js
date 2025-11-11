/**
 * Validate and retrieve API key from environment
 * @returns {string|null} The API key if found, otherwise null
 */
export function validateApiKey() {
  return process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || null;
}