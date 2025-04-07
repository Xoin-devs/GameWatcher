/**
 * Integration tests for the Game Controller
 */
const gameController = require('../../../src/controllers/gameController');
const GameService = require('../../../src/services/gameService');
const httpMocks = require('node-mocks-http');
const { success, error } = require('../../../src/utils/response');

// Mock the GameService module
jest.mock('../../../src/services/gameService');

describe('Game Controller Tests', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
    
    // Set up request, response, and next function mocks
    req = httpMocks.createRequest({
      method: 'GET',
      url: '/api/guilds'
    });
    
    res = httpMocks.createResponse({
      eventEmitter: require('events').EventEmitter
    });
    
    // Add sendSuccess and sendError helpers to res
    res.sendSuccess = jest.fn((data, message, statusCode = 200) => {
      res.status(statusCode).json(success(data, message, statusCode));
      return res;
    });
    
    res.sendError = jest.fn((message, statusCode = 400, errors = null) => {
      res.status(statusCode).json(error(message, statusCode, errors));
      return res;
    });
    
    next = jest.fn();
  });
  
  describe('getGuilds', () => {
    it('should return guilds and respond with success', async () => {
      const mockGuilds = [
        { id: '123', channel_id: '456', webhook_url: 'https://example.com/webhook' }
      ];
      
      GameService.getAllGuilds.mockResolvedValue(mockGuilds);
      
      await gameController.getGuilds(req, res, next);
      
      expect(GameService.getAllGuilds).toHaveBeenCalled();
      expect(res.sendSuccess).toHaveBeenCalledWith(
        mockGuilds,
        'Guilds retrieved successfully'
      );
      expect(res._getStatusCode()).toBe(200);
    });
    
    it('should pass errors to the next middleware', async () => {
      const mockError = new Error('Database error');
      GameService.getAllGuilds.mockRejectedValue(mockError);
      
      await gameController.getGuilds(req, res, next);
      
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });
  
  describe('getGuildDetails', () => {
    beforeEach(() => {
      req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/guilds/123',
        params: {
          guildId: '123'
        }
      });
    });
    
    it('should return guild details when guild exists', async () => {
      const mockGuild = { id: '123', channel_id: '456', webhook_url: 'https://example.com/webhook' };
      
      GameService.getGuildById.mockResolvedValue(mockGuild);
      
      await gameController.getGuildDetails(req, res, next);
      
      expect(GameService.getGuildById).toHaveBeenCalledWith('123');
      expect(res.sendSuccess).toHaveBeenCalledWith(
        mockGuild,
        'Guild details retrieved successfully'
      );
      expect(res._getStatusCode()).toBe(200);
    });
    
    it('should return 404 when guild does not exist', async () => {
      GameService.getGuildById.mockResolvedValue(null);
      
      await gameController.getGuildDetails(req, res, next);
      
      expect(GameService.getGuildById).toHaveBeenCalledWith('123');
      expect(res.sendError).toHaveBeenCalledWith(
        'Guild not found',
        404
      );
      expect(res._getStatusCode()).toBe(404);
    });
  });
  
  describe('getGamesWithSubscriptionStatus', () => {
    beforeEach(() => {
      req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/guilds/123/games?page=2&limit=10&search=test&filter=subscribed',
        params: {
          guildId: '123'
        },
        query: {
          page: '2',
          limit: '10',
          search: 'test',
          filter: 'subscribed'
        }
      });
    });
    
    it('should return games with pagination info', async () => {
      const mockResult = {
        games: [
          { id: 1, name: 'Game 1', subscribed: true },
          { id: 2, name: 'Game 2', subscribed: false }
        ],
        pagination: {
          total: 50,
          totalPages: 5,
          page: 2,
          limit: 10
        }
      };
      
      GameService.getGuildGamesWithPagination.mockResolvedValue(mockResult);
      
      await gameController.getGamesWithSubscriptionStatus(req, res, next);
      
      expect(GameService.getGuildGamesWithPagination).toHaveBeenCalledWith('123', 2, 10, 'test', 'subscribed');
      expect(res.sendSuccess).toHaveBeenCalledWith(
        {
          games: mockResult.games,
          pagination: mockResult.pagination
        },
        'Games retrieved successfully'
      );
    });
  });
  
  describe('getGuildGameStats', () => {
    beforeEach(() => {
      req = httpMocks.createRequest({
        method: 'GET',
        url: '/api/guilds/123/stats',
        params: {
          guildId: '123'
        }
      });
    });
    
    it('should return game statistics for a guild', async () => {
      const mockStats = {
        totalGames: 100,
        subscribedGames: 25
      };
      
      GameService.getGuildGameStats.mockResolvedValue(mockStats);
      
      await gameController.getGuildGameStats(req, res, next);
      
      expect(GameService.getGuildGameStats).toHaveBeenCalledWith('123');
      expect(res.sendSuccess).toHaveBeenCalledWith(
        mockStats,
        'Guild game statistics retrieved successfully'
      );
    });
  });
  
  describe('toggleGameSubscription', () => {
    beforeEach(() => {
      req = httpMocks.createRequest({
        method: 'POST',
        url: '/api/guilds/123/games/456/toggle',
        params: {
          guildId: '123',
          gameId: '456'
        }
      });
    });
    
    it('should return result when subscribing to a game', async () => {
      const mockResult = { subscribed: true };
      
      GameService.toggleGameSubscription.mockResolvedValue(mockResult);
      
      await gameController.toggleGameSubscription(req, res, next);
      
      expect(GameService.toggleGameSubscription).toHaveBeenCalledWith('123', '456');
      expect(res.sendSuccess).toHaveBeenCalledWith(
        mockResult,
        'Game subscribed successfully'
      );
    });
    
    it('should return result when unsubscribing from a game', async () => {
      const mockResult = { subscribed: false };
      
      GameService.toggleGameSubscription.mockResolvedValue(mockResult);
      
      await gameController.toggleGameSubscription(req, res, next);
      
      expect(GameService.toggleGameSubscription).toHaveBeenCalledWith('123', '456');
      expect(res.sendSuccess).toHaveBeenCalledWith(
        mockResult,
        'Game unsubscribed successfully'
      );
    });
  });
});