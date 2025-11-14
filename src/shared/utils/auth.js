/**
 * Validate and retrieve API key from environment
 * Checks known providers (OpenAI, OpenRouter, Gemini) in order
 * @returns {string|null} The API key if found, otherwise null
 */
export function validateApiKey() {
  return process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.GEMINI_API_KEY ||
    null;
}
