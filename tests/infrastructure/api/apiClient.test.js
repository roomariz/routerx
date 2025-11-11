// tests/infrastructure/api/apiClient.test.js
// Unit tests for API client functionality

import ApiClient from '../../../src/infrastructure/api/apiClient.js';

describe('ApiClient', () => {
  let apiClient;
  const mockConfig = { timeout: 30000 };

  beforeEach(() => {
    apiClient = new ApiClient(mockConfig);
  });

  test('should initialize with correct configuration', () => {
    expect(apiClient.config).toEqual(mockConfig);
  });

  test('should have required methods', () => {
    expect(typeof apiClient.makeChatCompletion).toBe('function');
    expect(typeof apiClient.fetchModels).toBe('function');
    expect(typeof apiClient.makeGeneralChat).toBe('function');
  });
});