// src/infrastructure/api/apiClient.js
import axios from 'axios';

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
      throw this.handleError(error);
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
      throw this.handleError(error);
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
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   * @param {Error} error - The error to handle
   * @returns {Error} Formatted error
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return new Error(`API Error: ${status} - ${data.error?.message || 'Unknown error'}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network Error: Request failed to reach the server');
    } else {
      // Something else happened
      return new Error(`Request Error: ${error.message}`);
    }
  }
}

export default ApiClient;