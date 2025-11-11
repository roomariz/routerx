// tests/unit/api.test.js
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import axios from 'axios';
import { makeChatCompletion, fetchModels, makeGeneralChat } from '../../src/api.js';

// Mock axios
jest.mock('axios');
const mockAxios = jest.requireMock('axios');

describe('API Functions', () => {
  const mockApiKey = 'test-api-key';
  const mockModel = 'test/model';
  const mockPrompt = 'test prompt';
  const mockBaseUrl = 'https://api.test.com';
  const mockTimeout = 30000;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('makeChatCompletion calls axios with correct parameters', async () => {
    const mockResponse = { data: 'test stream' };
    mockAxios.mockResolvedValue(mockResponse);

    const result = await makeChatCompletion(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl,
      mockTimeout
    );

    expect(mockAxios).toHaveBeenCalledWith({
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
      timeout: mockTimeout,
    });
    
    expect(result).toEqual(mockResponse);
  });

  test('fetchModels calls axios get with correct parameters', async () => {
    const mockResponse = { data: { models: ['model1', 'model2'] } };
    mockAxios.get.mockResolvedValue(mockResponse);

    const result = await fetchModels(mockBaseUrl, mockTimeout);

    expect(mockAxios.get).toHaveBeenCalledWith(`${mockBaseUrl}/models`, {
      timeout: mockTimeout,
    });
    
    expect(result).toEqual(mockResponse);
  });

  test('makeGeneralChat calls axios post with correct parameters', async () => {
    const mockResponse = { data: { choices: [{ message: { content: 'response' } }] } };
    mockAxios.post.mockResolvedValue(mockResponse);

    const result = await makeGeneralChat(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl,
      mockTimeout
    );

    expect(mockAxios.post).toHaveBeenCalledWith(
      `${mockBaseUrl}/chat/completions`,
      { model: mockModel, messages: [{ role: "user", content: mockPrompt }] },
      {
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: mockTimeout,
      }
    );
    
    expect(result).toEqual(mockResponse);
  });

  test('API functions handle errors correctly', async () => {
    const error = new Error('Network error');
    mockAxios.mockRejectedValue(error);

    await expect(makeChatCompletion(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl,
      mockTimeout
    )).rejects.toThrow('Network error');
  });
});