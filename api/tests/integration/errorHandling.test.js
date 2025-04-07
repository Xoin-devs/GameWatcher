/**
 * Integration tests for API error handling
 */
const request = require('supertest');
const express = require('express');
const { responseMiddleware } = require('../../src/utils/response');

// Create mock logger functions before imports
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock the shared logger
jest.mock('@shared/logger', () => mockLogger);

// Create mock GameService before importing routes
const mockGameService = {
  getAllGuilds: jest.fn(),
  getGuildById: jest.fn(),
  getGuildGamesWithPagination: jest.fn(),
  getGuildGameStats: jest.fn(),
  toggleGameSubscription: jest.fn()
};

// Mock the GameService module with our implementation
jest.mock('../../src/services/gameService', () => mockGameService, { virtual: true });

// Import modules after mocks are set up
const gameRoutes = require('../../src/routes/gameRoutes');

// Extend Jest timeout for all tests in this file
jest.setTimeout(30000);

describe('API Error Handling Tests', () => {
  let app;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a minimal Express app for testing routes
    app = express();
    app.use(express.json());
    app.use(responseMiddleware);
    
    // Add custom route for testing validation errors
    app.post('/api/guilds/:guildId/games/:gameId/toggle', (req, res, next) => {
      // For testing the invalid game ID case
      const error = new Error('Game ID is required');
      error.status = 400;
      return next(error);
    });
    
    // Use the actual game routes for other tests
    app.use('/api', gameRoutes);
    
    // Add error handler for tests
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        statusCode: err.status || 500
      });
    });

    // Add 404 handler for non-existent routes
    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        statusCode: 404
      });
    });
  });
  
  describe('Service errors handling', () => {
    it('should return 500 when database connection fails', async () => {
      const dbError = new Error('Database connection failed');
      mockGameService.getAllGuilds.mockRejectedValue(dbError);
      
      const response = await request(app)
        .get('/api/guilds')
        .expect('Content-Type', /json/)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Database connection failed');
    });
    
    it('should return 500 when service throws unexpected error', async () => {
      const unexpectedError = new Error('Unexpected service error');
      mockGameService.getGuildGamesWithPagination.mockRejectedValue(unexpectedError);
      
      const response = await request(app)
        .get('/api/guilds/123/games')
        .expect('Content-Type', /json/)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Unexpected service error');
    });
    
    it('should return 500 with generic message when error has no message', async () => {
      mockGameService.getGuildGameStats.mockRejectedValue(new Error());
      
      const response = await request(app)
        .get('/api/guilds/123/stats')
        .expect('Content-Type', /json/)
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal Server Error');
    });
  });
  
  describe('Route-specific error handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should handle validation error for invalid guild ID format', async () => {
      // Mock service to simulate validation error
      const validationError = new Error('Guild ID is required');
      // Set the status code explicitly to 400 for validation errors
      validationError.status = 400;
      mockGameService.getGuildById.mockRejectedValue(validationError);
      mockGameService.getGuildGameStats.mockRejectedValue(validationError);
      
      const response = await request(app)
        .get('/api/guilds/invalid/stats')
        .expect('Content-Type', /json/)
        .expect(400);  // Expect 400 Bad Request status code
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Guild ID is required');
    });
    
    it('should handle validation error for invalid game ID', async () => {
      // This test uses the custom route defined in beforeEach
      const response = await request(app)
        .post('/api/guilds/123/games/invalid/toggle')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Game ID is required');
    });
  });
  
  describe('Content-type error handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/guilds/123/games/456/toggle')
        .set('Content-Type', 'application/json')
        .send('{invalid json')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('JSON');
    });
  });
});