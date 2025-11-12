# RouterX Test Suite Documentation

## Overview

The RouterX test suite is designed to provide comprehensive coverage of all functionality to ensure code quality, prevent regressions, and build user confidence. The test suite is organized into:

- **Unit Tests** - Testing individual modules and functions in isolation
- **Integration Tests** - Testing how different modules work together
- **CLI Tests** - Testing the command-line interface functionality

## Test Structure

### Unit Tests (`tests/unit/`)
Cover individual modules in isolation, including:

- `api.test.js` / `apiClient.test.js` – API client, retries, and error handling.
- `config.test.js` / `configManager.test.js` – Configuration loading, overrides, and validation.
- `code.test.js`, `chat.test.js`, `models.test.js` – Command handlers and CLI glue code.
- `resilience.test.js`, `metrics.test.js`, `metricsCommand.test.js` – Resilience helpers, metrics registry, and snapshot exporter.
- `envLoader.test.js`, `utils.test.js`, `streamHandler.test.js` – Shared utilities.

### Integration Tests (`tests/integration/`)
Exercise whole CLI flows with mocked transport and filesystem boundaries:

- `cli.test.js`, `cli-full.test.js`, `cli-integration.test.js` – Commander wiring, option parsing, and happy paths.
- `command-integration.test.js`, `api-integration.test.js` – Cross-command behaviour and API orchestration.

### Performance Tests (`tests/performance/`)
- `streaming-performance.test.js` ensures streaming output keeps latency, throughput, and memory usage within expected guardrails.

## Running Tests

### Basic Test Check
```bash
npm test
```
This runs the default Jest suite (unit tests) with caching disabled, mirroring what CI executes.

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
