# Contributing to RouterX

Thank you for your interest in contributing to RouterX! We welcome contributions from the community and appreciate your help in making this tool better.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our community approachable and respectful.

## How Can I Contribute?

### Reporting Bugs

- Use the GitHub issue tracker to report bugs
- Follow the provided issue template when creating new issues
- Check the existing issues first to avoid duplicates
- Include as much detail as possible: environment, steps to reproduce, expected vs actual behavior

### Suggesting Enhancements

- Use the GitHub issue tracker for feature requests
- Provide a clear description of the enhancement
- Explain why this enhancement would be useful

### Pull Requests

- Fork the repository and create a feature branch from `main`
- Follow the existing code style and conventions
- Add or update tests as appropriate
- Update documentation as needed
- Ensure all tests pass
- Use clear, descriptive commit messages
- Include helpful comments in your code

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/routerx.git
   cd routerx
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your API keys:
   ```env
   OPENROUTER_API_KEY=your_api_key_here
   # or
   OPENAI_API_KEY=your_api_key_here
   ```

4. Test your changes locally:
   ```bash
   node index.js --help
   ```

## Project Structure

- `index.js` - Main CLI implementation
- `package.json` - Project metadata and dependencies
- `README.md` - User documentation
- `CONTRIBUTING.md` - This file
- `.env` - Local environment variables (not committed)

## Testing

We maintain a comprehensive test suite to ensure code quality and prevent regressions. All contributions should include appropriate tests:

- Add unit tests for new functionality in the `tests/unit/` directory
- Add integration tests in the `tests/integration/` directory when appropriate
- Run the full test suite before submitting a pull request:
  ```bash
  npm test          # Basic test check
  npm run test:all  # Full test suite with Jest
  npm run test:coverage  # Generate coverage report
  ```
- For more details about the test suite, see [TESTING.md](TESTING.md)

## Code Guidelines

- Use consistent formatting (ESLint may be added in the future)
- Add comments for complex logic
- Follow the existing patterns in the codebase
- Ensure error handling is comprehensive
- Keep commands focused and follow the existing structure

## Commit Messages

Use clear, descriptive commit messages that follow conventional commits or similar:

```
feat: Add new code diff functionality
fix: Resolve issue with model selection fallback
docs: Update README with new examples
```

## Questions?

If you have questions about contributing, feel free to open an issue for discussion.

Thank you for your contribution!