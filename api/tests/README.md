# API Testing Documentation

This directory contains tests for the Game News Forge API, organized into different types of tests to ensure comprehensive code coverage and robust functionality.

## Test Structure

```
tests/
  ├── setup.js                # Global test setup
  ├── mocks/                  # Mock implementations and test helpers
  │   ├── config.mock.js      # Test configuration
  │   ├── databaseManager.mock.js # Mock database implementation
  │   └── testHelpers.js      # Common test utilities
  │
  ├── unit/                   # Unit tests for isolated components
  │   ├── services/           # Tests for service layer
  │   └── utils/              # Tests for utility functions
  │
  ├── integration/            # Tests for component interactions
  │   └── controllers/        # Tests for controller logic
  │
  └── e2e/                    # End-to-end API tests
      └── routes/             # Tests for API routes
```

## Test Types

### Unit Tests

- Test individual functions and classes in isolation
- Mock all dependencies
- Fast execution, focused scope
- Located in the `unit/` directory

### Integration Tests

- Test interactions between components
- May use mocks for external dependencies
- Located in the `integration/` directory

### End-to-End Tests

- Test complete API request-response cycles
- Test routes, middleware, and controllers together
- Located in the `e2e/` directory

## Running Tests

Run the full test suite with code coverage:

```
npm test
```

Run tests in watch mode during development:

```
npm run test:watch
```

Run specific test types:

```
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Test Configuration

Test configuration is defined in:

- `jest.config.js` - Jest configuration
- `.env.test` - Environment variables for testing
- `tests/mocks/config.mock.js` - API configuration for tests

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests.

2. **Mock External Dependencies**: Use mock implementations for external services like the database.

3. **Clear Setup and Teardown**: Initialize required state before tests and clean up afterward.

4. **Descriptive Test Names**: Use descriptive names that explain the expected behavior.

5. **Coverage Goals**: Aim for at least 80% code coverage across all components.

6. **Test Maintenance**: Update tests when API functionality changes.

## Adding New Tests

When adding new functionality to the API:

1. Add unit tests for any new services or utilities
2. Add controller tests to verify request handling
3. Add E2E tests to verify the complete request flow
4. Ensure all error cases are tested

## Continuous Integration

Tests are automatically run in the CI pipeline. Failed tests will prevent deployment.