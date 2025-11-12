// src/infrastructure/api/apiClient.js
import axios from 'axios';
import { handleAPIError } from '../../shared/utils/error.js';

/**
 * API Client for RouterX
 * Handles all API interactions with the AI service
 */
class ApiClient {
  constructor(config = {}) {
    this.config = config;
    this.axiosInstance = axios.create({
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Make a chat completion API call with streaming
   * @param {string} apiKey - API key for authentication
   * @param {string} model - Model to use
   * @param {string} prompt - User prompt
   * @param {string} baseUrl - API base URL
   * @returns {Promise<Object>} API response stream
   */
  async makeChatCompletion(apiKey, model, prompt, baseUrl) {
    try {
      return await this.axiosInstance({
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
      });
    } catch (error) {
      const context = { operation: 'makeChatCompletion', model, baseUrl };
      throw handleAPIError(error, context);
    }
  }

  /**
   * Fetch available models from API
   * @param {string} baseUrl - API base URL
   * @returns {Promise<Object>} API response with models
   */
  async fetchModels(baseUrl) {
    try {
      const response = await this.axiosInstance.get(`${baseUrl}/models`);
      return response;
    } catch (error) {
      const context = { operation: 'fetchModels', baseUrl };
      throw handleAPIError(error, context);
    }
  }

  /**
   * Make a general chat API call (non-streaming)
   * @param {string} apiKey - API key for authentication
   * @param {string} model - Model to use
   * @param {string} prompt - User prompt
   * @param {string} baseUrl - API base URL
   * @returns {Promise<Object>} API response
   */
  async makeGeneralChat(apiKey, model, prompt, baseUrl) {
    try {
      const response = await this.axiosInstance.post(
        `${baseUrl}/chat/completions`,
        { model, messages: [{ role: "user", content: prompt }] },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response;
    } catch (error) {
      const context = { operation: 'makeGeneralChat', model, baseUrl };
      throw handleAPIError(error, context);
    }
  }

  /**
   * Public method to handle errors similar to the internal handleAPIError function
   * @param {Error} error - The error to handle
   * @returns {Error} Formatted error object
   */
  handleError(error) {
    // We'll return the result of handleAPIError with a generic context
    // For the test purposes, we don't include specific context
    return handleAPIError(error, { operation: 'test' });
  }
}

export default ApiClient;