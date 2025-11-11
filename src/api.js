// src/api.js
import axios from 'axios';

/**
 * Make a chat completion API call
 * @param {string} apiKey - API key for authentication
 * @param {string} model - Model to use
 * @param {string} prompt - User prompt
 * @param {string} baseUrl - API base URL
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} API response
 */
export async function makeChatCompletion(apiKey, model, prompt, baseUrl, timeout) {
  return axios({
    method: "post",
    url: `${baseUrl}/chat/completions`,
    data: {
      model,
      stream: true,
      messages: [{ role: "user", content: prompt }],
    },
    responseType: "stream",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout,
  });
}

/**
 * Fetch available models from API
 * @param {string} baseUrl - API base URL
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} API response with models
 */
export async function fetchModels(baseUrl, timeout) {
  return axios.get(`${baseUrl}/models`, {
    timeout,
  });
}

/**
 * Make a general chat API call
 * @param {string} apiKey - API key for authentication
 * @param {string} model - Model to use
 * @param {string} prompt - User prompt
 * @param {string} baseUrl - API base URL
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} API response
 */
export async function makeGeneralChat(apiKey, model, prompt, baseUrl, timeout) {
  return axios.post(
    `${baseUrl}/chat/completions`,
    { model, messages: [{ role: "user", content: prompt }] },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout,
    }
  );
}