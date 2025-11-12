// tests/performance/streaming-performance.test.js
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import { PassThrough } from 'stream';
import ApiClient from '../../src/infrastructure/api/index.js';

// Mock axios
jest.mock('axios');
const mockAxios = axios;

// Mock stream to simulate Server-Sent Events
function createMockSSEStream(messages) {
  const stream = new PassThrough();
  
  // Simulate SSE data chunks
  const sseData = messages.map(msg => `data: ${JSON.stringify(msg)}\n\n`).join('');
  const doneMessage = 'data: [DONE]\n\n';
  
  setTimeout(() => {
    stream.push(sseData);
    stream.push(doneMessage);
    stream.push(null); // End stream
  }, 0);
  
  return stream;
}

describe('Streaming Performance Tests', () => {
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

  test('measures streaming response time for simple prompt', async () => {
    const mockApiKey = 'test-api-key';
    const mockModel = 'test/model';
    const mockPrompt = 'simple test';
    const mockBaseUrl = 'https://openrouter.ai/api/v1';

    // Mock response with streaming data
    const mockStream = createMockSSEStream([
      { choices: [{ delta: { content: 'Hello' } }] },
      { choices: [{ delta: { content: ' world' } }] },
      { choices: [{ delta: { content: '.' } }] }
    ]);
    
    const mockResponse = { data: mockStream };
    mockAxios.mockResolvedValue(mockResponse);

    const startTime = Date.now();
    const response = await apiClient.makeChatCompletion(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl
    );
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    
    // Expect the API call to be made with correct parameters
    expect(mockAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        url: `${mockBaseUrl}/chat/completions`,
        data: {
          model: mockModel,
          stream: true,
          messages: [{ role: 'user', content: mockPrompt }],
        },
        responseType: 'stream',
        headers: {
          Authorization: `Bearer ${mockApiKey}`,
          'Content-Type': 'application/json',
        },
      })
    );
    
    expect(response).toEqual(mockResponse);
    console.log(`\n⏱️  Streaming API call took: ${duration}ms`);
  });

  test('measures streaming response time for longer response', async () => {
    const mockApiKey = 'test-api-key';
    const mockModel = 'test/model';
    const mockPrompt = 'Write a longer response';
    const mockBaseUrl = 'https://openrouter.ai/api/v1';

    // Create a longer simulated response with more chunks
    const responseChunks = [];
    const words = ['This', 'is', 'a', 'longer', 'response', 'with', 'more', 'chunks', 'to', 'simulate', 'realistic', 'streaming', 'behavior'];
    
    for (let i = 0; i < words.length; i++) {
      responseChunks.push({
        choices: [{ delta: { content: words[i] + (i < words.length - 1 ? ' ' : '.') } }]
      });
    }

    const mockStream = createMockSSEStream(responseChunks);
    const mockResponse = { data: mockStream };
    mockAxios.mockResolvedValue(mockResponse);

    const startTime = Date.now();
    const response = await apiClient.makeChatCompletion(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl
    );
    const endTime = Date.now();
    
    const duration = endTime - startTime;
    
    expect(response).toEqual(mockResponse);
    console.log(`\n⏱️  Longer streaming API call took: ${duration}ms`);
    
    // Performance assertion - should complete within reasonable time
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('measures memory usage during streaming', async () => {
    const mockApiKey = 'test-api-key';
    const mockModel = 'test/model';
    const mockPrompt = 'Test for memory usage';
    const mockBaseUrl = 'https://openrouter.ai/api/v1';

    // Generate a large response to test memory usage
    const responseChunks = [];
    for (let i = 0; i < 100; i++) {
      responseChunks.push({
        choices: [{ delta: { content: `Chunk number ${i}. ` } }]
      });
    }

    const mockStream = createMockSSEStream(responseChunks);
    const mockResponse = { data: mockStream };
    mockAxios.mockResolvedValue(mockResponse);

    // Record memory before
    const memoryBefore = process.memoryUsage().heapUsed;
    
    const startTime = Date.now();
    const response = await apiClient.makeChatCompletion(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl
    );
    const endTime = Date.now();
    
    // Record memory after
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryDiff = memoryAfter - memoryBefore;
    
    const duration = endTime - startTime;
    
    expect(response).toEqual(mockResponse);
    console.log(`\n📊 Memory usage during streaming: ${Math.round(memoryDiff / 1024)} KB`);
    console.log(`⏱️  Large streaming API call took: ${duration}ms`);
    
    // Memory should not grow excessively
    expect(memoryDiff).toBeLessThan(50 * 1024 * 1024); // Less than 50 MB
  });

  test('compares streaming vs non-streaming response times', async () => {
    const mockApiKey = 'test-api-key';
    const mockModel = 'test/model';
    const mockPrompt = 'Compare response times';
    const mockBaseUrl = 'https://openrouter.ai/api/v1';

    // Test streaming version
    const mockStream = createMockSSEStream([
      { choices: [{ delta: { content: 'Streaming' } }] },
      { choices: [{ delta: { content: ' response' } }] },
      { choices: [{ delta: { content: '.' } }] }
    ]);
    
    mockAxios.mockResolvedValue({ data: mockStream });
    
    const startTimeStreaming = Date.now();
    const streamingResponse = await apiClient.makeChatCompletion(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl
    );
    const endTimeStreaming = Date.now();
    const streamingDuration = endTimeStreaming - startTimeStreaming;
    
    // Reset mock for non-streaming version
    jest.clearAllMocks();
    
    // Mock non-streaming response
    const mockNonStreamingResponse = {
      data: {
        choices: [{ message: { content: 'Non-streaming response.' } }]
      }
    };
    mockAxios.post.mockResolvedValue(mockNonStreamingResponse);
    
    const startTimeNonStreaming = Date.now();
    const nonStreamingResponse = await apiClient.makeGeneralChat(
      mockApiKey,
      mockModel,
      mockPrompt,
      mockBaseUrl
    );
    const endTimeNonStreaming = Date.now();
    const nonStreamingDuration = endTimeNonStreaming - startTimeNonStreaming;
    
    console.log(`\n⚡ Streaming vs Non-streaming comparison:`);
    console.log(`   Streaming: ${streamingDuration}ms`);
    console.log(`   Non-streaming: ${nonStreamingDuration}ms`);
    
    // Note: The actual performance difference depends on the implementation details
    // The streaming test measures the API call time, not the actual streaming experience
    expect(streamingResponse).toBeDefined();
    expect(nonStreamingResponse).toBeDefined();
  });

  test('measures time to first token in streaming response', async () => {
    const mockApiKey = 'test-api-key';
    const mockModel = 'test/model';
    const mockPrompt = 'First token timing test';
    const mockBaseUrl = 'https://openrouter.ai/api/v1';

    // Create a stream that simulates delay before first token
    const mockStream = new PassThrough();
    
    // Simulate a delay before sending first token to test time-to-first-token
    setTimeout(() => {
      mockStream.push(`data: ${JSON.stringify({ choices: [{ delta: { content: 'First' } }] })}\n\n`);
    }, 70); // 70ms delay before first token to provide buffer for timing variance
    
    setTimeout(() => {
      mockStream.push(`data: ${JSON.stringify({ choices: [{ delta: { content: ' token' } }] })}\n\n`);
      mockStream.push('data: [DONE]\n\n');
      mockStream.push(null); // End stream
    }, 140); // Additional 70ms for subsequent tokens
    
    const mockResponse = { data: mockStream };
    mockAxios.mockResolvedValue(mockResponse);

    await new Promise((resolve, reject) => {
      const startTime = Date.now();
      let firstTokenReceived = false;
      let firstTokenTime = 0;
      
      apiClient.makeChatCompletion(
        mockApiKey,
        mockModel,
        mockPrompt,
        mockBaseUrl
      ).then(response => {
        response.data.on('data', () => {
          if (!firstTokenReceived) {
            firstTokenReceived = true;
            firstTokenTime = Date.now();
            console.log(`\n⏱️  Time to first token: ${firstTokenTime - startTime}ms`);
          }
        });
        
        response.data.on('end', () => {
          const totalTime = Date.now() - startTime;
          console.log(`⏱️  Total streaming time: ${totalTime}ms`);
          
          try {
            expect(totalTime).toBeGreaterThanOrEqual(120); // Should take at least 120ms due to delays
            expect(firstTokenTime - startTime).toBeGreaterThanOrEqual(60); // First token after ~70ms delay
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        response.data.on('error', reject);
      }).catch(reject);
    });
  });
});
