export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {},
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],
  collectCoverageFrom: [
    'index.js',
    'src/**/*.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverage: true,
  clearMocks: true,
  // Enable ESM modules support
  experimentalVmModules: true,
};