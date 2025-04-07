/**
 * Integration tests for API input validation
 */
const request = require('supertest');
const express = require('express');

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
  getGuildGamesWithPagination: jest.fn().mockResolvedValue({
    games: [],
    pagination: { total: 0, totalPages: 0, page: 1, limit: 20 }
  }),
  toggleGameSubscription: jest.fn().mockResolvedValue({ subscribed: true })
};

// Mock the GameService module with our implementation
jest.mock('../../src/services/gameService', () => mockGameService, { virtual: true });

// Import modules after mocks are set up
const gameRoutes = require('../../src/routes/gameRoutes');
const { responseMiddleware } = require('../../src/utils/response');

// Extend Jest timeout for all tests in this file
jest.setTimeout(30000);

describe('API Input Validation Tests', () => {
  let app;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create a minimal Express app for testing routes
    app = express();
    app.use(express.json());
    app.use(responseMiddleware);
    app.use('/api', gameRoutes);
  });
  
  describe('Pagination parameter validation', () => {
    it('should reject negative page numbers', async () => {
      const response = await request(app)
        .get('/api/guilds/123/games?page=-1')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].path).toBe('page');
    });
    
    it('should reject page number of zero', async () => {
      const response = await request(app)
        .get('/api/guilds/123/games?page=0')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].path).toBe('page');
    });
    
    it('should reject negative limit values', async () => {
      const response = await request(app)
        .get('/api/guilds/123/games?limit=-10')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].path).toBe('limit');
    });
    
    it('should reject limit values above maximum', async () => {
      const response = await request(app)
        .get('/api/guilds/123/games?limit=101')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].path).toBe('limit');
    });
    
    it('should accept valid pagination parameters', async () => {
      await request(app)
        .get('/api/guilds/123/games?page=5&limit=50')
        .expect(200);
      
      expect(mockGameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 5, 50, '', '');
    });
  });
  
  describe('Filter parameter validation', () => {
    it('should accept valid filter values', async () => {
      await request(app)
        .get('/api/guilds/123/games?filter=subscribed')
        .expect(200);
      
      expect(mockGameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 1, 20, '', 'subscribed');
      
      await request(app)
        .get('/api/guilds/123/games?filter=unsubscribed')
        .expect(200);
      
      expect(mockGameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 1, 20, '', 'unsubscribed');
      
      await request(app)
        .get('/api/guilds/123/games?filter=')
        .expect(200);
      
      expect(mockGameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 1, 20, '', '');
    });
  });
  
  describe('Game ID parameter validation', () => {
    it('should reject non-numeric game IDs', async () => {
      const response = await request(app)
        .post('/api/guilds/123/games/abc/toggle')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].path).toBe('gameId');
    });
    
    it('should accept valid game IDs', async () => {
      await request(app)
        .post('/api/guilds/123/games/456/toggle')
        .expect(200);
      
      expect(mockGameService.toggleGameSubscription).toHaveBeenCalledWith('123', '456');
    });
  });
  
  describe('Guild ID parameter validation', () => {
    it('should reject empty guild IDs', async () => {
      const response = await request(app)
        .get('/api/guilds//games')
        .expect(404);
      
      expect(response.statusCode).toBe(404);
    });
    
    it('should accept various valid guild ID formats', async () => {
      // Numeric guild ID
      await request(app)
        .get('/api/guilds/123/games')
        .expect(200);
      
      expect(mockGameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 1, 20, '', '');
      
      // Discord snowflake format guild ID
      await request(app)
        .get('/api/guilds/123456789012345678/games')
        .expect(200);
      
      expect(mockGameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123456789012345678', 1, 20, '', '');
    });
  });
});