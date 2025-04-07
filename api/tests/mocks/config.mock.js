/**
 * Test environment configuration
 */
const baseConfig = require('../config');
const logger = require('@shared/logger');

// Override config values for test environment
const testConfig = {
  ...baseConfig,
  
  // Use test-specific port
  port: process.env.TEST_API_PORT || 8474,
  
  // Test environment
  nodeEnv: 'test',
  
  // Database config for tests (could use in-memory DB or test DB)
  db: {
    ...baseConfig.db,
    database: process.env.TEST_DB_NAME || `${baseConfig.db.database}_test`
  },
  
  // Test-specific functionality
  isTestEnv: () => true
};

// Log test configuration
logger.debug('Test API Configuration:', {
  port: testConfig.port,
  environment: testConfig.nodeEnv,
  dbName: testConfig.db.database
});

module.exports = testConfig;