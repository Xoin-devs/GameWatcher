/**
 * Test helper utility for creating app test instances 
 * and handling common testing operations
 */
const express = require('express');
const { responseMiddleware } = require('../../src/utils/response');

/**
 * Create a test instance of an Express app with necessary middleware
 * @returns {express.Application} Express application instance for testing
 */
function createTestApp() {
  const app = express();
  
  // Add basic middleware for testing
  app.use(express.json());
  
  // Add response helper middleware
  app.use(responseMiddleware);
  
  return app;
}

/**
 * Helper for generating test guild data
 * @param {Object} override - Properties to override in the default test guild
 * @returns {Object} A test guild object
 */
function createTestGuild(override = {}) {
  return {
    id: '123456789012345678',
    channel_id: '111222333444555666',
    webhook_url: 'https://discord.com/api/webhooks/123/abc',
    ...override
  };
}

/**
 * Helper for generating test game data
 * @param {Object} override - Properties to override in the default test game
 * @returns {Object} A test game object
 */
function createTestGame(override = {}) {
  return {
    id: 1,
    name: 'Test Game',
    release_date: '2023-12-01',
    subscribed: false,
    ...override
  };
}

module.exports = {
  createTestApp,
  createTestGuild,
  createTestGame
};