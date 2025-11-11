# RouterX Test Suite Documentation

## Overview

The RouterX test suite is designed to provide comprehensive coverage of all functionality to ensure code quality, prevent regressions, and build user confidence. The test suite is organized into:

- **Unit Tests** - Testing individual modules and functions in isolation
- **Integration Tests** - Testing how different modules work together
- **CLI Tests** - Testing the command-line interface functionality

## Test Structure

### Unit Tests
Located in: `tests/unit/`

- `api.test.js` - Tests for the API client functionality
- `config.test.js` - Tests for the configuration manager
- `utils.test.js` - Tests for utility functions
- `commander.test.js` - Tests for CLI command structure
- `constants.test.js` - Tests for constants and configuration values

### Integration Tests
Located in: `tests/integration/`

- `cli.test.js` - Tests for CLI integration and error handling
- `api-integration.test.js` - Tests for API integration with mocked responses
- `cli-full.test.js` - Tests for full CLI functionality

## Running Tests

### Basic Test Check
```bash
npm test
```
This runs a basic check that verifies all test files exist and have the expected test definitions.

### Full Test Suite
```bash
npm run test:all
```
This runs the complete test suite using Jest.

### Test with Watch Mode
```bash
npm run test:watch
```
Run tests in watch mode, automatically re-running when files change.

### Test Coverage
```bash
npm run test:coverage
```
Generate coverage reports to see which code is covered by tests.

## Writing Tests

### Unit Tests
When writing unit tests, follow the AAA pattern:
- **Arrange**: Set up test data and dependencies
- **Act**: Execute the functionality being tested
- **Assert**: Verify the expected outcomes

### Integration Tests
Integration tests should test how multiple modules work together, including:
- API interactions (with mocked responses to avoid external dependencies)
- CLI command flows
- File system operations
- Configuration loading and merging

### Mocking External Dependencies
- Use Jest's built-in mocking functionality
- Mock external API calls to ensure tests are reliable and fast
- Mock file system operations when appropriate

## Test Coverage Goals

The test suite aims to maintain high coverage across:

1. **API Client**: 100% coverage of API request/response handling, error conditions, and edge cases
2. **Configuration**: All configuration loading, merging, and default value scenarios
3. **Utility Functions**: All file operations, path handling, and utility methods
4. **CLI Interface**: All commands, options, and argument parsing
5. **Error Handling**: All error conditions and error message formatting
6. **Constants**: All constant values and their usage

## Continuous Integration

The test suite is designed to run in a CI environment and includes:
- Fast execution with mocked external dependencies
- Comprehensive error reporting
- Coverage reporting
- Consistent behavior across different environments

## Maintenance

- All new features must include corresponding tests
- Refactoring should not break existing tests
- When fixing bugs, add tests to prevent regressions
- Regular review of test coverage to identify gaps