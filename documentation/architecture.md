# RouterX - Modular CLI Architecture

RouterX is a lightweight CLI for interacting with OpenRouter models and AI services. This project follows a modular architecture with clean separation of concerns.

## Architecture Overview

The project is organized following clean architecture principles:

```
├── bin/
│   └── routerx.js          # CLI executable entry (boots src/cli/bootstrap)
├── src/
│   ├── cli/                # CLI bootstrap, command registration, Commander program
│   ├── commands/           # Individual command modules (chat, models, code, health, metrics)
│   ├── core/               # setupCLI exports for embedding
│   ├── infrastructure/     # API client, config manager, env loader
│   ├── monitoring/         # Logger, tracer, metrics, success metrics
│   ├── resilience/         # Retry policy, circuit breaker, resilience helpers
│   ├── shared/             # Cross-cutting constants and utilities
│   └── utils/              # File helpers and other shared logic
└── tests/
    ├── unit/               # Module-level tests (commands, config, monitoring, resilience, ...)
    ├── integration/        # CLI integration flows
    ├── performance/        # Streaming performance coverage
    └── testUtils.js        # Shared fixtures
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
- `routerx health` - Run runtime, API, and filesystem health checks (text or JSON)
- `routerx metrics` - Export in-memory counters, histograms, and success metrics snapshots

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

Tests mirror the architecture: `tests/unit` exercises individual modules, `tests/integration` validates whole CLI flows, and `tests/performance` keeps streaming guarantees honest.

## License

MIT
