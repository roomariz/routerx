export default {
  testMatch: [
    "**/tests/**/*.test.js"
  ],
  testPathIgnorePatterns: [
    "/node_modules/"
  ],
  collectCoverageFrom: [
    "src/**/*.{js}",
    "!src/**/*.test.{js}",
    "!**/node_modules/**"
  ],
  coverageReporters: [
    "text",
    "lcov",
    "html"
  ],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!chalk|axios)/"
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mapping for old paths to new modular paths
    '^../api/api\\.js$': '<rootDir>/src/infrastructure/api/index.js',
    '^../../src/api/api\\.js$': '<rootDir>/src/infrastructure/api/index.js',
    '^../../src/config/config\\.js$': '<rootDir>/src/infrastructure/config/index.js',
    '^../../src/utils/(.*)$': '<rootDir>/src/shared/utils/$1',
    '^../../src/constants\\.js$': '<rootDir>/src/shared/constants/index.js',
    '^../utils/fileUtils\\.js$': '<rootDir>/src/shared/utils/file.js',
    '^../utils/auth\\.js$': '<rootDir>/src/shared/utils/auth.js',
    '^../utils/errorHandler\\.js$': '<rootDir>/src/shared/utils/error.js',
    '^../utils/streamHandler\\.js$': '<rootDir>/src/shared/utils/stream.js',
    '^../config/config\\.js$': '<rootDir>/src/infrastructure/config/index.js',
    '^../api/api\\.js$': '<rootDir>/src/infrastructure/api/index.js',
    '^../../src/utils/fileUtils\\.js$': '<rootDir>/src/shared/utils/file.js',
    '^../../src/utils/auth\\.js$': '<rootDir>/src/shared/utils/auth.js',
    '^../../src/utils/errorHandler\\.js$': '<rootDir>/src/shared/utils/error.js',
    '^../../src/utils/streamHandler\\.js$': '<rootDir>/src/shared/utils/stream.js',
    '^../commands/chat\\.js$': '<rootDir>/src/commands/chat/index.js',
    '^../commands/models\\.js$': '<rootDir>/src/commands/models/index.js',
    '^../commands/code\\.js$': '<rootDir>/src/commands/code/index.js',
    '^../utils/envLoader\\.js$': '<rootDir>/src/infrastructure/env/envLoader.js',
  },
  moduleFileExtensions: ['js', 'json', 'node'],
  testTimeout: 15000
};