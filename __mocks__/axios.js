// __mocks__/axios.js
import { jest } from '@jest/globals';

// Mock implementation of axios
const mockAxios = jest.fn(); // This is for direct axios() calls
mockAxios.get = jest.fn();
mockAxios.post = jest.fn();
// Mock the create method for more complex configurations
mockAxios.create = jest.fn(() => mockAxios);
// Mock the response interceptors and other properties as needed
mockAxios.defaults = {
  headers: {
    common: {},
  },
};

export default mockAxios;