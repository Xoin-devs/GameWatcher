/**
 * Jest configuration for API tests
 */
module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Automatically clear mock calls and instances between tests
  clearMocks: true,
  
  // Coverage settings
  collectCoverage: false,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!src/config/swagger.js'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Module path aliases
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../shared/$1',
    '^@api/(.*)$': '<rootDir>/src/$1'
  },
  
  // Test timeout settings
  testTimeout: 10000,
  
  // Verbose test output
  verbose: true
};