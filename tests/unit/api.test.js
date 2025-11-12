// tests/unit/api.test.js
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import axios from 'axios';
import ApiClient from '../../src/infrastructure/api/index.js';

// Mock axios
jest.mock('axios');

// Get the mock object 
const mockAxios = axios;

describe('ApiClient', () => {
  let apiClient;
  const mockConfig = {
    timeout: 30000,
    defaultModel: 'openai/gpt-4o-mini',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultSavePath: './outputs',
    maxRetries: 3,
    resilience: {
      timeoutMs: 30000,
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      jitterMs: 250,
      breakerThreshold: 5,
      breakerCooldownMs: 60000
    }
  };

  beforeEach(() => {
    apiClient = new ApiClient(mockConfig);
    jest.clearAllMocks();
  });

  describe('makeChatCompletion', () => {
    test('makes chat completion request with correct parameters', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://api.test.com';
      const mockResponse = { data: 'test stream' };
      
      axios.mockResolvedValue(mockResponse);

      const result = await apiClient.makeChatCompletion(
        mockApiKey,
        mockModel,
        mockPrompt,
        mockBaseUrl
      );

      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
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
        timeout: 30000,
        signal: expect.any(Object)
      }));

      expect(result).toEqual(mockResponse);
    });

    test('handles API error responses', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://api.test.com';
      
      const errorResponse = {
        response: {
          status: 401,
          data: { error: { message: 'Unauthorized' } }
        }
      };
      axios.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeChatCompletion(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('API Error: 401 - Unauthorized');
    });

    test('handles network errors', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://api.test.com';
      
      const errorResponse = {
        request: {}
      };
      axios.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeChatCompletion(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('Network Error: Request failed to reach the server');
    });

    test('handles generic request errors', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://api.test.com';
      
      const errorResponse = new Error('Generic error');
      axios.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeChatCompletion(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('Request Error: Generic error');
    });
  });

  describe('fetchModels', () => {
    test('fetches models with correct parameters', async () => {
      const mockBaseUrl = 'https://api.test.com';
      const mockResponse = { data: { data: ['model1', 'model2'] } };
      
      axios.get.mockResolvedValue(mockResponse);

      const result = await apiClient.fetchModels(mockBaseUrl);

      expect(axios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/models`,
        expect.objectContaining({
          timeout: 30000,
          signal: expect.any(Object)
        })
      );
      expect(result).toEqual(mockResponse);
    });

    test('handles API error responses when fetching models', async () => {
      const mockBaseUrl = 'https://api.test.com';
      
      const errorResponse = {
        response: {
          status: 500,
          data: { error: { message: 'Internal Server Error' } }
        }
      };
      axios.get.mockRejectedValue(errorResponse);

      await expect(
        apiClient.fetchModels(mockBaseUrl)
      ).rejects.toThrow('API Error: 500 - Internal Server Error');
    });

    test('handles network errors when fetching models', async () => {
      const mockBaseUrl = 'https://api.test.com';
      
      const errorResponse = {
        request: {}
      };
      axios.get.mockRejectedValue(errorResponse);

      await expect(
        apiClient.fetchModels(mockBaseUrl)
      ).rejects.toThrow('Network Error: Request failed to reach the server');
    });
  });

  describe('makeGeneralChat', () => {
    test('makes general chat request with correct parameters', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://api.test.com';
      const mockResponse = { data: { choices: [{ message: { content: 'response' } }] } };
      
      axios.post.mockResolvedValue(mockResponse);

      const result = await apiClient.makeGeneralChat(
        mockApiKey,
        mockModel,
        mockPrompt,
        mockBaseUrl
      );

      expect(axios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/chat/completions`,
        { model: mockModel, messages: [{ role: "user", content: mockPrompt }] },
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
          signal: expect.any(Object)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    test('handles API error responses for general chat', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://api.test.com';
      
      const errorResponse = {
        response: {
          status: 429,
          data: { error: { message: 'Rate limit exceeded' } }
        }
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeGeneralChat(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('API Error: 429 - Rate limit exceeded');
    });

    test('handles network errors for general chat', async () => {
      const mockApiKey = 'test-api-key';
      const mockModel = 'test/model';
      const mockPrompt = 'test prompt';
      const mockBaseUrl = 'https://api.test.com';
      
      const errorResponse = {
        request: {}
      };
      axios.post.mockRejectedValue(errorResponse);

      await expect(
        apiClient.makeGeneralChat(mockApiKey, mockModel, mockPrompt, mockBaseUrl)
      ).rejects.toThrow('Network Error: Request failed to reach the server');
    });
  });

  describe('handleError', () => {
    test('formats API error with status and message', () => {
      const error = {
        response: {
          status: 400,
          data: { error: { message: 'Bad Request' } }
        }
      };
      
      const handledError = apiClient.handleError(error);
      expect(handledError.message).toBe('API Error: 400 - Bad Request');
    });

    test('formats API error with unknown message when no error message provided', () => {
      const error = {
        response: {
          status: 500,
          data: {}
        }
      };
      
      const handledError = apiClient.handleError(error);
      expect(handledError.message).toBe('API Error: 500 - Unknown error');
    });

    test('formats network errors', () => {
      const error = {
        request: {}
      };
      
      const handledError = apiClient.handleError(error);
      expect(handledError.message).toBe('Network Error: Request failed to reach the server');
    });

    test('formats generic request errors', () => {
      const error = new Error('Something went wrong');
      
      const handledError = apiClient.handleError(error);
      expect(handledError.message).toBe('Request Error: Something went wrong');
    });
  });
});