// tests/integration/api-integration.test.js
import { describe, test, expect, jest } from '@jest/globals';
import axios from 'axios';
import ApiClient from '../../src/api/api.js';

// Mock axios for integration tests to avoid making real API calls
jest.mock('axios');

describe('API Integration Tests', () => {
  let apiClient;
  const mockConfig = {
    timeout: 30000,
    defaultModel: 'openai/gpt-4o-mini',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultSavePath: './outputs',
    maxRetries: 3
  };

  beforeEach(() => {
    apiClient = new ApiClient(mockConfig);
    jest.clearAllMocks();
  });

  describe('makeChatCompletion integration', () => {
    test('successfully returns a response on successful API call', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://openrouter.ai/api/v1';
      
      // Mock the successful API response
      const mockStream = { on: jest.fn() };
      const mockResponse = { data: mockStream };

      axios.mockResolvedValue(mockResponse);

      const response = await apiClient.makeChatCompletion(
        mockApiKey,
        mockModel,
        mockPrompt,
        mockBaseUrl
      );

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          url: `${mockBaseUrl}/chat/completions`,
          data: {
            model: mockModel,
            stream: true,
            messages: [{ role: "user", content: mockPrompt }],
          },
          responseType: "stream",
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          },
        })
      );
      expect(response).toEqual(mockResponse);
    });

    test('handles authentication errors properly', async () => {
      const mockApiKey = 'invalid-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://openrouter.ai/api/v1';
      
      // Mock an API response with 401 error
      const errorResponse = {
        response: {
          status: 401,
          data: { error: { message: 'Authentication failed' } }
        }
      };
      axios.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeChatCompletion(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('API Error: 401 - Authentication failed');
    });

    test('handles rate limiting properly', async () => {
      const mockApiKey = 'rate-limited-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://openrouter.ai/api/v1';
      
      // Mock an API response with 429 error
      const errorResponse = {
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } }
        }
      };
      axios.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeChatCompletion(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('API Error: 429 - Rate limit exceeded');
    });
  });

  describe('fetchModels integration', () => {
    test('successfully fetches models from API', async () => {
      const mockBaseUrl = 'https://openrouter.ai/api/v1';
      const mockModels = [
        { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
        { id: 'google/gemini-pro', name: 'Gemini Pro' }
      ];
      
      const mockResponse = {
        data: { data: mockModels }
      };
      axios.get.mockResolvedValue(mockResponse);

      const response = await apiClient.fetchModels(mockBaseUrl);
      
      expect(axios.get).toHaveBeenCalledWith(`${mockBaseUrl}/models`);
      expect(response.data.data).toEqual(mockModels);
    });

    test('handles model fetch errors properly', async () => {
      const mockBaseUrl = 'https://openrouter.ai/api/v1';
      
      // Mock an API response with 500 error
      const errorResponse = {
        response: {
          status: 500,
          data: { error: { message: 'Server error' } }
        }
      };
      axios.get.mockRejectedValue(errorResponse);

      await expect(
        apiClient.fetchModels(mockBaseUrl)
      ).rejects.toThrow('API Error: 500 - Server error');
    });
  });

  describe('makeGeneralChat integration', () => {
    test('successfully returns a response on successful API call', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://openrouter.ai/api/v1';
      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Test response' } }]
        }
      };
      
      axios.post.mockResolvedValue(mockResponse);

      const response = await apiClient.makeGeneralChat(
        mockApiKey,
        mockModel,
        mockPrompt,
        mockBaseUrl
      );

      expect(axios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/chat/completions`,
        { model: mockModel, messages: [{ role: "user", content: mockPrompt }] },
        {
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      expect(response.data.choices[0].message.content).toBe('Test response');
    });

    test('handles bad request errors properly', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://openrouter.ai/api/v1';
      
      const errorResponse = {
        response: {
          status: 400,
          data: { error: { message: 'Invalid request' } }
        }
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeGeneralChat(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('API Error: 400 - Invalid request');
    });
  });

  test('uses custom timeout from config', () => {
    const customConfig = { timeout: 5000 };
    const customApiClient = new ApiClient(customConfig);
    
    // Verify that the timeout was set correctly in the axios instance
    expect(customApiClient.config.timeout).toBe(5000);
  });
});