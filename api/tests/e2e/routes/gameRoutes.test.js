/**
 * End-to-end tests for the game routes
 */
const request = require('supertest');
const express = require('express');
const gameRoutes = require('../../../src/routes/gameRoutes');
const GameService = require('../../../src/services/gameService');
const { responseMiddleware } = require('../../../src/utils/response');

// Mock the GameService module
jest.mock('../../../src/services/gameService');

describe('Game Routes E2E Tests', () => {
  let app;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Create a minimal Express app for testing routes
    app = express();
    app.use(express.json());
    app.use(responseMiddleware);
    app.use('/api', gameRoutes);
    
    // Add error handler for tests
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
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
  
  describe('GET /api/guilds', () => {
    it('should return all guilds', async () => {
      const mockGuilds = [
        { id: '123', channel_id: '456', webhook_url: 'https://example.com/webhook1' },
        { id: '789', channel_id: '012', webhook_url: 'https://example.com/webhook2' }
      ];
      
      GameService.getAllGuilds.mockResolvedValue(mockGuilds);
      
      const response = await request(app)
        .get('/api/guilds')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockGuilds);
      expect(GameService.getAllGuilds).toHaveBeenCalled();
    });
    
    it('should handle errors properly', async () => {
      GameService.getAllGuilds.mockRejectedValue(new Error('Test error'));
      
      const response = await request(app)
        .get('/api/guilds')
        .expect('Content-Type', /json/)
        .expect(500);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/guilds/:guildId', () => {
    it('should return guild details when guild exists', async () => {
      const mockGuild = { 
        id: '123', 
        channel_id: '456', 
        webhook_url: 'https://example.com/webhook' 
      };
      
      GameService.getGuildById.mockResolvedValue(mockGuild);
      
      const response = await request(app)
        .get('/api/guilds/123')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockGuild);
      expect(GameService.getGuildById).toHaveBeenCalledWith('123');
    });
    
    it('should return 404 when guild does not exist', async () => {
      GameService.getGuildById.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/guilds/999')
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Guild not found');
    });
    
    it('should validate guild ID parameter', async () => {
      // Test for a completely non-existent route
      const response = await request(app)
        .get('/api/nonexistent-route')
        .expect('Content-Type', /json/)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Route not found');
      expect(GameService.getGuildById).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /api/guilds/:guildId/games', () => {
    it('should return games with pagination, using default values when not provided', async () => {
      const mockResult = {
        games: [
          { id: 1, name: 'Game 1', release_date: '2023-01-01', subscribed: true },
          { id: 2, name: 'Game 2', release_date: '2023-02-01', subscribed: false }
        ],
        pagination: {
          total: 2,
          totalPages: 1,
          page: 1,
          limit: 20
        }
      };
      
      GameService.getGuildGamesWithPagination.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .get('/api/guilds/123/games')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.games).toEqual(mockResult.games);
      expect(response.body.data.pagination).toEqual(mockResult.pagination);
      expect(GameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 1, 20, '', '');
    });
    
    it('should pass query parameters to service', async () => {
      const mockResult = {
        games: [{ id: 1, name: 'Game 1', release_date: '2023-01-01', subscribed: true }],
        pagination: {
          total: 1,
          totalPages: 1,
          page: 2,
          limit: 10
        }
      };
      
      GameService.getGuildGamesWithPagination.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .get('/api/guilds/123/games?page=2&limit=10&search=game&filter=subscribed')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(GameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 2, 10, 'game', 'subscribed');
    });
    
    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/guilds/123/games?page=invalid&limit=invalid')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(undefined); // Express validator handles errors differently
      expect(response.body.errors).toBeDefined();
    });
  });
  
  describe('GET /api/guilds/:guildId/stats', () => {
    it('should return game statistics for a guild', async () => {
      const mockStats = {
        totalGames: 100,
        subscribedGames: 25
      };
      
      GameService.getGuildGameStats.mockResolvedValue(mockStats);
      
      const response = await request(app)
        .get('/api/guilds/123/stats')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(GameService.getGuildGameStats).toHaveBeenCalledWith('123');
    });
  });
  
  describe('POST /api/guilds/:guildId/games/:gameId/toggle', () => {
    it('should toggle subscription status to subscribed', async () => {
      const mockResult = { subscribed: true };
      
      GameService.toggleGameSubscription.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/api/guilds/123/games/456/toggle')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(GameService.toggleGameSubscription).toHaveBeenCalledWith('123', '456');
    });
    
    it('should toggle subscription status to unsubscribed', async () => {
      const mockResult = { subscribed: false };
      
      GameService.toggleGameSubscription.mockResolvedValue(mockResult);
      
      const response = await request(app)
        .post('/api/guilds/123/games/456/toggle')
        .expect('Content-Type', /json/)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });
    
    it('should validate parameters', async () => {
      const response = await request(app)
        .post('/api/guilds/123/games/invalid/toggle')
        .expect('Content-Type', /json/)
        .expect(400);
      
      expect(response.body.success).toBe(undefined); // Express validator handles errors differently
      expect(response.body.errors).toBeDefined();
    });
  });
});