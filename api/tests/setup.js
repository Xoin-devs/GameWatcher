/**
 * Setup file for API tests
 * This runs before all tests and sets up global configurations
 */
const path = require('path');

// Set up module alias for shared code
require('module-alias/register');

// Mock logger to prevent console clutter during tests
jest.mock('@shared/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Set test environment variables if needed
process.env.NODE_ENV = 'test';
process.env.API_PORT = '8474'; // Different port for testing