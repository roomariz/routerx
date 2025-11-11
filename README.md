# RouterX

A lightweight CLI for interacting with OpenRouter models and AI services. Provides chat capabilities, model listing, and code assistance directly from your terminal. This is an independent tool that works with OpenRouter's API, not the official OpenRouter CLI.

## Features

- **Chat Interface**: Engage in conversations with various AI models
- **Code Assistance**: Generate, explain, fix, review, or compare code
- **Model Discovery**: List and search available AI models
- **Multiple Provider Support**: Works with OpenRouter and OpenAI APIs
- **Streaming Responses**: Real-time output for faster feedback
- **File Output**: Save AI responses directly to files
- **Configurable Models**: Use your preferred AI model for tasks

## Installation

Install globally using npm:

```bash
npm install -g routerx
```

## Prerequisites

You'll need an API key from OpenRouter or OpenAI. Add it to your `.env` file:

```env
OPENROUTER_API_KEY=your_api_key_here
# or
OPENAI_API_KEY=your_api_key_here
```

## Usage

### Chat with AI Models

```bash
routerx chat "Hello, how are you?"
```

Options:
- `--model <model>`: Specify model name (default: openai/gpt-4o-mini)
- `--base-url <url>`: Override API base URL
- `--save <file>`: Save the response to a file

### List Available Models

```bash
routerx models
```

Options:
- `--free`: Show only free models
- `--search <keyword>`: Filter models by keyword

### Code Assistant

```bash
routerx code [mode] [target...]
```

Modes:
- `generate`: Generate code (default)
- `explain`: Explain code
- `fix`: Fix code
- `review`: Review code
- `diff`: Compare two files

Options:
- `--model <model>`: Force specific model ID
- `--save <path>`: Save output to file
- `--context <dir>`: Add folder context
- `--free`: Force only free model fallback
- `--prefer <keyword>`: Bias model selection

## Examples

Chat with default settings:
```bash
routerx chat "What is the weather like today?"
```

Use a specific model:
```bash
routerx chat --model "mistralai/mistral-7b-instruct" "Write a short poem"
```

Get code help:
```bash
routerx code explain mycode.js
```

Generate code:
```bash
routerx code generate "Create a function to calculate factorial in Python"
```

Compare two files:
```bash
routerx code diff file1.js file2.js
```

Save chat response to file:
```bash
routerx chat --save response.txt "Explain quantum computing"
```

Search for specific models:
```bash
routerx models --search "gpt-4"
```

List only free models:
```bash
routerx models --free
```

## Configuration

RouterX can be configured using multiple methods:

### Environment Variables

Create a `.env` file in your project root or home directory:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENAI_API_KEY=your_openai_api_key
```

RouterX will use `OPENROUTER_API_KEY` if available, otherwise it falls back to `OPENAI_API_KEY`.

### Configuration File

RouterX supports a JSON configuration file to set default values. Create a `config.json` file in your home directory or in the current working directory:

```json
{
  "defaultModel": "openai/gpt-4o-mini",
  "defaultBaseUrl": "https://openrouter.ai/api/v1",
  "defaultSavePath": "./outputs",
  "maxRetries": 3,
  "timeout": 30000
}
```

To create your own config file, copy the example:

```bash
cp node_modules/routerx/config.example.json ~/routerx-config.json
```

Settings in the config file will override the default values but can be overridden by command-line options.

## Troubleshooting

- **API Key Issues**: Ensure your API keys are properly set in the environment
- **Model Not Found**: Check that the model ID exists in the available models list
- **Rate Limiting**: If you encounter rate limit errors, try using different models or wait before retrying

## Architecture

RouterX follows a modular architecture with the following structure:

```
.
├── index.js                 # Main CLI entry point
├── jest.config.js           # Jest configuration
├── test-runner.js           # Development test helper
├── package.json
├── README.md
├── src/                    # Source code
│   ├── api/                # API client and communication logic
│   │   └── api.js          # ApiClient class for handling API requests
│   ├── config/             # Configuration management
│   │   └── config.js       # ConfigManager class for loading settings
│   ├── utils/              # Utility functions
│   │   └── index.js        # Common utility functions
│   └── constants.js        # Application constants and messages
└── tests/                  # Test files
    ├── integration/        # Integration tests
    │   └── cli.test.js
    ├── unit/               # Unit tests
    │   ├── api.test.js
    │   ├── commander.test.js
    │   └── config.test.js
    └── testUtils.js        # Test utilities
```

### API Module
- Handles all API communications with AI services
- Implements proper error handling and response parsing
- Supports both streaming and non-streaming requests

### Config Module
- Manages application configuration loading
- Supports multiple configuration sources
- Validates and merges configuration values

### Utils Module
- Provides common utility functions
- File system operations with proper error handling
- Path normalization and timestamp formatting

### Constants Module
- Centralized constants for error messages, log messages, and default values
- Improves maintainability and consistency

## Development

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/routerx.git
   cd routerx
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   node index.js chat "Hello from development mode!"
   ```

4. Run tests:
   ```bash
   npm test
   ```

### Test Structure

RouterX has a comprehensive test suite to ensure functionality and catch regressions, organized as follows:

- **Unit Tests** (`tests/unit/`): Test individual functions and modules in isolation
  - `api.test.js`: API client functionality and error handling
  - `config.test.js`: Configuration loading and merging logic
  - `utils.test.js`: File operations, path handling, and utility methods
  - `commander.test.js`: CLI command structure and option parsing
  - `constants.test.js`: Constants and configuration values validation

- **Integration Tests** (`tests/integration/`): Test how different modules work together
  - `cli.test.js`: CLI integration and error handling
  - `api-integration.test.js`: API integration with mocked responses
  - `cli-full.test.js`: Full CLI functionality tests

- **Test Utilities** (`tests/testUtils.js`): Shared utilities for testing

The project uses Jest for testing with proper ESM module support configured in `jest.config.js`.

To run tests:
```bash
npm test                    # Basic test check
npm run test:all            # Full test suite with Jest
npm run test:coverage       # Generate coverage report
npm run test:watch          # Run tests in watch mode
```

For more details about the test suite, see [TESTING.md](./documentation/TESTING.md).

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./documentation/CONTRIBUTING.md) for details on how to get started.

## Code of Conduct

Please read and follow our [Code of Conduct](./documentation/CODE_OF_CONDUCT.md) to keep our community approachable and respectful.

## Changelog

See our [Changelog](./documentation/CHANGELOG.md) for a history of changes and releases.

## License

MIT