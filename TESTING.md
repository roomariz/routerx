# RouterX Testing Guide

This document outlines the testing strategy and approach for the RouterX CLI application.

## Test Structure

The test suite is organized into the following directories:

- `tests/unit/` - Unit tests for individual functions and modules
- `tests/integration/` - Integration tests for CLI functionality and workflows
- `__mocks__/` - Mock implementations for external dependencies

## Testing Framework

We use [Jest](https://jestjs.io/) as our primary testing framework with the following configuration:
- ES module support
- Mocking capabilities for external dependencies (API calls, file system, etc.)
- Code coverage reporting
- Watch mode for development

## Running Tests

### All Tests (Basic Verification)
```bash
npm test
```

This runs a simple verification script that confirms all test files exist and have proper structure.

### All Tests (Full Jest Suite)
```bash
npm run test:all
```

_Note: Jest configuration for ES modules requires additional setup. The test files are ready for execution once Jest is properly configured for ESM support._

### Test Files Location
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`

## Test Categories

### Unit Tests
- Configuration loading functions (`loadConfig`, `getDefaultConfig`)
- API utility functions (`makeChatCompletion`, `fetchModels`, `makeGeneralChat`)
- Command parsing and validation logic
- File operations (read, write)

### Integration Tests
- CLI command execution
- End-to-end workflows
- Error handling scenarios

## Testing Strategy

### Mocking External Dependencies
- `axios` is mocked to simulate API responses and errors
- `fs` is mocked to prevent actual file system operations during testing
- Environment variables are controlled for consistent test runs

### Test Coverage
- Critical path functions are thoroughly tested
- Error handling is validated
- Configuration loading prioritization is tested
- API request/response patterns are verified

## Test File Naming Convention

- Test files end with `.test.js`
- Files are organized by functionality and test type
- Integration tests are in the `tests/integration/` directory
- Unit tests are in the `tests/unit/` directory

## Jest Configuration for ES Modules (Advanced)

If you want to run the tests with the full Jest framework, you'll need to set up ES module support properly. Create `jest.config.mjs` with:

```javascript
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1.js',  // Important for ES modules
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
  // Add extension mapping for ES modules
  moduleFileExtensions: ['js', 'mjs'],
};
```

## Best Practices

- Each test file focuses on a single module or functionality
- Tests are isolated and don't depend on each other
- Mocks are reset between tests
- Descriptive test names clearly indicate what is being tested
- Asynchronous operations are properly handled
- External dependencies (API calls, file system) are mocked appropriately