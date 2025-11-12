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

### Health Checks

```bash
routerx health
```

Runs dependency probes for:
- API connectivity (primary `/health` endpoint with fallback)
- API key validation (`OPENAI_API_KEY` or `OPENROUTER_API_KEY`)
- Filesystem readiness for the configured output directory

Sample output:
```
🩺 RouterX Runtime & Dependency Health
Timestamp: 2024-01-01T00:00:00.000Z

✅ API Health — HEALTHY
   latency: 120ms
   endpoint: /health

✅ API Key — HEALTHY
   API key detected in environment

✅ Filesystem Readiness — HEALTHY
   Output directory is accessible

Overall status: HEALTHY
```

Use `--json` for machine-readable output (ideal for CI/CD or scripts):

```bash
routerx health --json | jq '.status'
```

The JSON schema includes `status`, `timestamp`, `environment`, `summary`, and an array of `checks[]` objects (`name`, `status`, `message`, `latencyMs`, `details`). The CLI exits with code `1` when the overall status is degraded or unhealthy so you can gate pipelines on dependency readiness.

## Examples

### Chat Commands

Chat with default settings:
```bash
routerx chat "What is the weather like today?"
```

Sample output:
```
[2023-11-11T10:30:00.000Z] 🧠 Sending to model: openai/gpt-4o-mini
[2023-11-11T10:30:00.000Z] 🔗 API Base URL: https://openrouter.ai/api/v1
[2023-11-11T10:30:00.000Z] 📝 Prompt: "What is the weather like today?"
[2023-11-11T10:30:00.000Z] 💬 Reply (streaming):

I don't have access to real-time weather data, but I can help you find current weather information.
You can check weather services like Weather.com, AccuWeather, or use a weather app on your phone.
If you tell me your location, I can suggest how to find weather information for your area.

[2023-11-11T10:30:05.000Z] ✅ Stream complete.
```

Use a specific model:
```bash
routerx chat --model "mistralai/mistral-7b-instruct" "Write a short poem"
```

Sample output:
```
[2023-11-11T10:35:00.000Z] 🧠 Sending to model: mistralai/mistral-7b-instruct
[2023-11-11T10:35:00.000Z] 🔗 API Base URL: https://openrouter.ai/api/v1
[2023-11-11T10:35:00.000Z] 📝 Prompt: "Write a short poem"
[2023-11-11T10:35:00.000Z] 💬 Reply (streaming):

In the quiet of dawn's embrace,
Where light whispers to the sky,
A gentle breeze brings nature's grace,
As birds prepare to say goodbye.

The world awakens, fresh and new,
With colors painted bright and bold,
The morning sun with golden hue,
Creates a story yet untold.

[2023-11-11T10:35:08.000Z] ✅ Stream complete.
```

Save chat response to file:
```bash
routerx chat --save response.txt "Explain quantum computing"
```

Sample output:
```
[2023-11-11T10:40:00.000Z] 🧠 Sending to model: openai/gpt-4o-mini
[2023-11-11T10:40:00.000Z] 🔗 API Base URL: https://openrouter.ai/api/v1
[2023-11-11T10:40:00.000Z] 📝 Prompt: "Explain quantum computing"
[2023-11-11T10:40:00.000Z] 💬 Reply (streaming):

Quantum computing is a type of computing that uses quantum mechanics to process information.
Unlike classical computers that use bits with values of 0 or 1, quantum computers use quantum bits (qubits)
that can exist in multiple states simultaneously through superposition.

Key principles include:
- Superposition: Qubits can represent multiple states at once
- Entanglement: Qubits can be linked in ways that classical bits cannot
- Quantum interference: Used to amplify correct solutions and cancel wrong ones

Quantum computers have potential applications in cryptography, drug discovery, and solving complex optimization problems.

[2023-11-11T10:40:15.000Z] ✅ Stream complete. Saved to response.txt
```

### Code Assistant Commands

Get code help:
```bash
routerx code explain mycode.js
```

Sample output:
```
🧠 Using model: openai/gpt-4o-mini
📝 Mode: explain

💬 Reply:
This JavaScript code implements a simple calculator with functions for addition, subtraction, multiplication, and division. The code includes error handling for division by zero and exports the functions for use in other modules. The calculator functions take two numeric parameters and return the result of the operation.

[2023-11-11T11:00:00.000Z] 💾 Saved to outputs/explanation.txt
```

Generate code:
```bash
routerx code generate "Create a function to calculate factorial in Python"
```

Sample output:
```
🧠 Using model: openai/gpt-4o-mini
📝 Mode: generate

💬 Reply:
```python
def factorial(n):
    """Calculate the factorial of n."""
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    if n == 0 or n == 1:
        return 1
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

# Example usage:
print(factorial(5))  # Output: 120
```

Compare two files:
```bash
routerx code diff file1.js file2.js
```

Sample output:
```
🧠 Using model: openai/gpt-4o-mini
📝 Mode: diff

💬 Reply:
The key differences between the two files are:

1. Function naming: file1.js uses 'calculateSum' while file2.js uses 'addNumbers'
2. Input validation: file2.js includes additional checks for numeric inputs
3. Return statement: file2.js has more detailed error handling for non-numeric inputs
4. Comment style: file2.js includes more comprehensive documentation comments

Overall, file2.js is more robust with better error handling and clearer documentation.
```

Fix code issues:
```bash
routerx code fix buggy.js
```

Sample output:
```
🧠 Using model: openai/gpt-4o-mini
📝 Mode: fix

💬 Reply:
```javascript
function calculateTotal(items) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    if (typeof items[i].price === 'number') {
      total += items[i].price;
    }
  }
  return total;
}
```

The main fixes included:
1. Added array validation check
2. Fixed the undefined variable issue
3. Added proper type checking for price values
```

### Model Discovery Commands

List available models:
```bash
routerx models
```

Sample output:
```
📡 Fetching model list...

🧠 Available Models:

• openai/gpt-4o                     | Paid
• openai/gpt-4o-mini                | Paid
• anthropic/claude-3.5-sonnet       | Paid
• google/gemini-pro-1.5             | Paid
• mistralai/mistral-7b-instruct     | Paid
• openchat/openchat-7b              | Free
• pygmalionai/mythalion-13b         | Free
• huggingfaceh4/zephyr-7b-beta      | Free
```

Search for specific models:
```bash
routerx models --search "gpt-4"
```

Sample output:
```
📡 Fetching model list...

🧠 Available Models matching 'gpt-4':

• openai/gpt-4o                     | Paid
• openai/gpt-4o-mini                | Paid
• openai/gpt-4-turbo                | Paid
• openai/gpt-4                      | Paid
```

List only free models:
```bash
routerx models --free
```

Sample output:
```
📡 Fetching model list...

🧠 Available Models Free:

• openchat/openchat-7b              | Free
• pygmalionai/mythalion-13b         | Free
• huggingfaceh4/zephyr-7b-beta      | Free
• cognitivecomputations/dolphin-mixtral-8x7b  | Free
• databricks/dbrx-instruct          | Free
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

### Validation & Required Fields

RouterX validates your configuration as soon as the CLI starts. If any required field is missing or has an invalid value, the CLI prints each validation error and exits rather than silently falling back to the built-in defaults. This helps operators spot misconfigurations before sending any API traffic.

Every configuration file must provide valid values for the following keys:

- `defaultModel`: Non-empty string referencing the default model (for example `openai/gpt-4o-mini`).
- `defaultBaseUrl`: Valid HTTPS URL for your API endpoint.
- `defaultSavePath`: Writable path used when `--save` is passed without a directory.
- `timeout`: Positive number (milliseconds) used for network timeouts.
- `maxRetries`: Non-negative integer for application-level retries.
- `resilience.timeoutMs`: Positive number for request timeouts applied by the resilience layer.
- `resilience.maxRetries`: Non-negative integer for resilience retry attempts.
- `resilience.baseDelayMs` / `resilience.maxDelayMs`: Positive numbers defining the exponential backoff range (`maxDelayMs` must be greater than or equal to `baseDelayMs`).
- `resilience.jitterMs`: Non-negative number that randomizes delay between retries.
- `resilience.breakerThreshold`: Positive integer that opens the circuit breaker after repeated failures.
- `resilience.breakerCooldownMs`: Positive number that determines how long the breaker waits before transitioning to half-open.
- `resilience.breakerHalfOpenSuccesses` / `resilience.breakerHalfOpenFailures`: Positive integers controlling how many attempts are required to close or reopen the breaker while half-open.

The bundled [`config.example.json`](./config.example.json) documents these requirements in the `_requiredFields` helper block—those `_` keys are informational and may be removed once you understand the constraints. When a validation error occurs you'll see output similar to:

```
Configuration validation failed. RouterX cannot start until the issues are fixed.
File: /Users/me/routerx-config.json
  1. timeout must be a positive number
  2. resilience.breakerThreshold must be a positive integer

Update the configuration file (or remove it to fall back to defaults) and rerun the CLI.
```

### Environment Overrides

Use environment variables to override individual configuration values without editing `config.json`. These overrides apply after RouterX loads and validates any config files, and invalid override values will stop startup with the same validation errors shown above.

| Variable | Description |
| --- | --- |
| `ROUTERX_CONFIG_PATH` | Absolute or relative path to the configuration file to load first. |
| `ROUTERX_DEFAULT_MODEL` | Overrides `defaultModel`. |
| `ROUTERX_DEFAULT_BASE_URL` | Overrides `defaultBaseUrl`. |
| `ROUTERX_DEFAULT_SAVE_PATH` | Overrides `defaultSavePath`. |
| `ROUTERX_TIMEOUT` | Overrides global `timeout` in milliseconds. |
| `ROUTERX_MAX_RETRIES` | Overrides global `maxRetries`. |
| `ROUTERX_RESILIENCE_TIMEOUT_MS` | Overrides `resilience.timeoutMs`. |
| `ROUTERX_RESILIENCE_MAX_RETRIES` | Overrides `resilience.maxRetries`. |
| `ROUTERX_RESILIENCE_BASE_DELAY_MS` | Overrides `resilience.baseDelayMs`. |
| `ROUTERX_RESILIENCE_MAX_DELAY_MS` | Overrides `resilience.maxDelayMs`. |
| `ROUTERX_RESILIENCE_JITTER_MS` | Overrides `resilience.jitterMs`. |
| `ROUTERX_RESILIENCE_BREAKER_THRESHOLD` | Overrides `resilience.breakerThreshold`. |
| `ROUTERX_RESILIENCE_BREAKER_COOLDOWN_MS` | Overrides `resilience.breakerCooldownMs`. |
| `ROUTERX_RESILIENCE_BREAKER_HALF_OPEN_SUCCESSES` | Overrides `resilience.breakerHalfOpenSuccesses`. |
| `ROUTERX_RESILIENCE_BREAKER_HALF_OPEN_FAILURES` | Overrides `resilience.breakerHalfOpenFailures`. |

Example:

```bash
export ROUTERX_CONFIG_PATH=$HOME/prod/routerx.json
export ROUTERX_DEFAULT_MODEL=openai/gpt-4o-mini
export ROUTERX_TIMEOUT=45000
```

## Troubleshooting

- **API Key Issues**: Ensure your API keys are properly set in the environment
- **Model Not Found**: Check that the model ID exists in the available models list
- **Rate Limiting**: If you encounter rate limit errors, try using different models or wait before retrying

## Architecture

RouterX follows a modular architecture based on clean architecture principles with the following structure:

```
.
├── index.js                 # Main CLI entry point
├── jest.config.js           # Jest configuration
├── test-runner.js           # Development test helper
├── package.json
├── README.md
├── bin/                    # Executable files
│   └── routerx.js          # CLI executable
├── src/                    # Source code
│   ├── cli/                # CLI application entry points and registration
│   │   ├── bootstrap.js    # Main CLI initialization
│   │   ├── registerCommands.js # Dynamic command loader
│   │   └── program.js      # Commander.js instance setup
│   ├── commands/           # Individual command modules
│   │   ├── chat/           # Chat command functionality
│   │   │   ├── command.js  # Command registration
│   │   │   ├── handler.js  # Business logic
│   │   │   └── index.js    # Module exports
│   │   ├── models/         # Models command functionality
│   │   │   ├── command.js  # Command registration
│   │   │   ├── handler.js  # Business logic
│   │   │   └── index.js    # Module exports
│   │   └── code/           # Code command functionality
│   │       ├── command.js  # Command registration
│   │       ├── handler.js  # Business logic
│   │       └── index.js    # Module exports
│   ├── infrastructure/     # External service integration
│   │   ├── api/            # API client and interactions
│   │   │   ├── apiClient.js # HTTP client and API interactions
│   │   │   └── index.js    # Export module interface
│   │   ├── config/         # Configuration management
│   │   │   ├── configManager.js # Configuration loading and management
│   │   │   └── index.js    # Export module interface
│   │   └── env/            # Environment handling
│   │       ├── envLoader.js # Environment variable loading
│   │       └── index.js    # Export module interface
│   ├── shared/             # Cross-cutting utilities and constants
│   │   ├── constants/      # Application constants
│   │   │   ├── cli.js      # CLI-related constants
│   │   │   ├── error.js    # Error message constants
│   │   │   ├── log.js      # Logging message constants
│   │   │   ├── default.js  # Default values and keywords
│   │   │   └── index.js    # Export all constants
│   │   └── utils/          # Shared utility functions
│   │       ├── auth.js     # API key validation
│   │       ├── error.js    # Error handling utilities
│   │       ├── file.js     # File operations
│   │       ├── stream.js   # Stream handling utilities
│   │       └── index.js    # Export all utilities
│   └── core/               # Core application logic
│       └── index.js        # Main library exports
└── tests/                  # Test files
    ├── cli/                # CLI-specific tests
    ├── commands/           # Command-specific tests
    ├── infrastructure/     # Infrastructure tests
    ├── shared/             # Shared utilities tests
    ├── integration/        # Integration tests
    │   └── cli.test.js
    ├── unit/               # Unit tests
    │   ├── api.test.js
    │   ├── commander.test.js
    │   └── config.test.js
    └── testUtils.js        # Test utilities
```

### CLI Domain
- Handles CLI application entry points and command registration
- Manages the overall CLI lifecycle and initialization

### Commands Domain
- Individual command modules with clear separation between registration and business logic
- Each command (chat, models, code) is a separate module with dedicated functionality

### Infrastructure Domain
- API client and communication logic with external services
- Configuration management with support for multiple configuration sources
- Environment handling and variable loading

### Shared Domain
- Cross-cutting utilities and constants used across the application
- Centralized error messages, logging messages, and default values
- Common file operations, error handling, and stream processing utilities

### Core Domain
- Main library exports and core application logic

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
   node bin/routerx.js chat "Hello from development mode!"
   ```

4. Run tests:
   ```bash
   npm test
   ```

### Test Structure

RouterX has a comprehensive test suite to ensure functionality and catch regressions, organized with a modular structure that mirrors the source code:

- **Unit Tests** (`tests/unit/`): Test individual functions and modules in isolation
  - `api.test.js`: API client functionality and error handling
  - `config.test.js`: Configuration loading and merging logic
  - `utils.test.js`: File operations, path handling, and utility methods
  - `commander.test.js`: CLI command structure and option parsing
  - `constants.test.js`: Constants and configuration values validation

- **Command Tests** (`tests/commands/`): Test individual command functionality
  - `chat.test.js`: Chat command business logic
  - `models.test.js`: Models command business logic
  - `code.test.js`: Code command business logic

- **Infrastructure Tests** (`tests/infrastructure/`): Test infrastructure components
  - `apiClient.test.js`: API client functionality
  - `configManager.test.js`: Configuration management
  - `envLoader.test.js`: Environment loading utilities

- **Shared Tests** (`tests/shared/`): Test shared utilities and constants
  - `utils/file.test.js`: File operations testing
  - `utils/auth.test.js`: Authentication utilities testing

- **Integration Tests** (`tests/integration/`): Test how different modules work together
  - `cli.test.js`: CLI integration and error handling
  - `api-integration.test.js`: API integration with mocked responses
  - `cli-full.test.js`: Full CLI functionality tests
  - `cli-integration.test.js`: CLI command integration tests
  - `command-integration.test.js`: Command integration tests

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

## Documentation

RouterX provides comprehensive documentation covering various aspects of the project:

- **[Contributing Guidelines](./documentation/CONTRIBUTING.md)**: How to contribute to the project
- **[Code of Conduct](./documentation/CODE_OF_CONDUCT.md)**: Community guidelines and expectations
- **[Changelog](./documentation/CHANGELOG.md)**: History of changes and releases
- **[Testing Guide](./documentation/TESTING.md)**: Details about the test suite and how to write tests
- **[Performance Testing](./documentation/PERFORMANCE.md)**: Performance benchmarks and streaming response metrics

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](./documentation/CONTRIBUTING.md) for details on how to get started.

## Code of Conduct

Please read and follow our [Code of Conduct](./documentation/CODE_OF_CONDUCT.md) to keep our community approachable and respectful.

## Changelog

See our [Changelog](./documentation/CHANGELOG.md) for a history of changes and releases.

## License

MIT
