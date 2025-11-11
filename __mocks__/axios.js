// __mocks__/axios.js
import { jest } from '@jest/globals';

// Mock implementation of axios
const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  // Mock the create method for more complex configurations
  create: jest.fn(() => mockAxios),
  // Mock the response interceptors and other properties as needed
  defaults: {
    headers: {
      common: {},
    },
  },
};

export default mockAxios;