# RouterX - Modular CLI Architecture

RouterX is a lightweight CLI for interacting with OpenRouter models and AI services. This project follows a modular architecture with clean separation of concerns.

## Architecture Overview

The project is organized following clean architecture principles:

```
src/
├── cli/                    # CLI application entry points and command registration
│   ├── bootstrap.js        # Main CLI initialization
│   ├── registerCommands.js # Dynamic command loader
│   └── program.js          # Commander.js instance setup
├── commands/              # Individual command modules
│   ├── chat/              # Chat command functionality
│   │   ├── command.js     # Command registration
│   │   ├── handler.js     # Business logic
│   │   └── index.js       # Module exports
│   ├── models/            # Models command functionality
│   │   ├── command.js     # Command registration
│   │   ├── handler.js     # Business logic
│   │   └── index.js       # Module exports
│   └── code/              # Code command functionality
│       ├── command.js     # Command registration
│       ├── handler.js     # Business logic
│       └── index.js       # Module exports
├── infrastructure/        # External service integration
│   ├── api/               # API client and interactions
│   ├── config/            # Configuration management
│   └── env/               # Environment handling
├── shared/                # Cross-cutting utilities and constants
│   ├── constants/         # Application constants
│   └── utils/             # Shared utility functions
└── core/                  # Core application logic
    └── index.js           # Main library exports
```

## Key Features

- **Modular Design**: Each command is a separate module with clear separation between registration and business logic
- **Clean Architecture**: Proper separation of concerns with dependency inversion
- **Testability**: Each module can be tested in isolation
- **Maintainability**: Clear boundaries between different components
- **Scalability**: Easy to add new commands without affecting existing code

## Commands

- `routerx chat <prompt>` - Chat with AI models
- `routerx models` - List available models
- `routerx code [mode] [target...]` - AI code assistance

## Development

To run the CLI:

```bash
npx routerx --help
```

Or for development:

```bash
node bin/routerx.js --help
```

## Testing

Tests are organized to mirror the source structure:

```
tests/
├── cli/
├── commands/
├── infrastructure/
├── shared/
└── integration/
```

## License

MIT