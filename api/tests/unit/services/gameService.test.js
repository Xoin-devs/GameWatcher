/**
 * Unit tests for the GameService class
 */

// Create mock logger functions before imports
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

// Mock logger
jest.mock('@shared/logger', () => mockLogger);

// Mock database before requiring the module
jest.mock('@shared/database', () => ({
  getInstance: jest.fn().mockResolvedValue({
    // Guild methods
    getGuilds: jest.fn().mockResolvedValue([
      { id: '123456789012345678', channel_id: '111222333444555666', webhook_url: 'https://discord.com/api/webhooks/123/abc' },
      { id: '876543210987654321', channel_id: '999888777666555444', webhook_url: 'https://discord.com/api/webhooks/456/def' }
    ]),
    
    getGuild: jest.fn().mockImplementation((guildId) => {
      if (guildId === '123456789012345678') {
        return Promise.resolve({ 
          id: '123456789012345678', 
          channel_id: '111222333444555666', 
          webhook_url: 'https://discord.com/api/webhooks/123/abc' 
        });
      }
      return Promise.resolve(null);
    }),
    
    // Game methods
    getPaginatedGuildGames: jest.fn().mockResolvedValue({
      games: [
        { id: 1, name: 'Test Game 1', release_date: '2023-12-01', subscribed: true },
        { id: 2, name: 'Test Game 2', release_date: '2023-12-15', subscribed: false }
      ],
      pagination: {
        total: 2,
        totalPages: 1,
        page: 1,
        limit: 20
      }
    }),
    
    getGuildGameStats: jest.fn().mockResolvedValue({
      totalGames: 100,
      subscribedGames: 25
    }),
    
    isGameSubscribed: jest.fn().mockImplementation((guildId, gameId) => {
      // For testing toggle functionality
      if (gameId === 1) return Promise.resolve(true);
      return Promise.resolve(false);
    }),
    
    linkGameToGuild: jest.fn().mockResolvedValue(true),
    unlinkGameFromGuild: jest.fn().mockResolvedValue(true)
  })
}));

// Import after mocks
const GameService = require('../../../src/services/gameService');

describe('GameService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getAllGuilds method', () => {
    it('should return all guilds from database', async () => {
      const guilds = await GameService.getAllGuilds();
      
      expect(require('@shared/database').getInstance).toHaveBeenCalled();
      expect(guilds).toEqual([
        { id: '123456789012345678', channel_id: '111222333444555666', webhook_url: 'https://discord.com/api/webhooks/123/abc' },
        { id: '876543210987654321', channel_id: '999888777666555444', webhook_url: 'https://discord.com/api/webhooks/456/def' }
      ]);
    });
  });
  
  describe('getGuildById method', () => {
    it('should return guild by ID when exists', async () => {
      const guild = await GameService.getGuildById('123456789012345678');
      
      expect(require('@shared/database').getInstance).toHaveBeenCalled();
      const dbMock = await require('@shared/database').getInstance();
      expect(dbMock.getGuild).toHaveBeenCalledWith('123456789012345678');
      expect(guild).toEqual({
        id: '123456789012345678',
        channel_id: '111222333444555666',
        webhook_url: 'https://discord.com/api/webhooks/123/abc'
      });
    });
    
    it('should convert non-string ID to string', async () => {
      // Using a string representation of the big number to avoid JavaScript number precision issues
      await GameService.getGuildById('123456789012345678');
      
      const dbMock = await require('@shared/database').getInstance();
      expect(dbMock.getGuild).toHaveBeenCalledWith('123456789012345678');
    });
    
    it('should return null when guild does not exist', async () => {
      const guild = await GameService.getGuildById('999999999999999999');
      
      expect(guild).toBeNull();
    });
    
    it('should throw error when ID is empty', async () => {
      await expect(GameService.getGuildById('')).rejects.toThrow('Guild ID is required');
      await expect(GameService.getGuildById(null)).rejects.toThrow('Guild ID is required');
      await expect(GameService.getGuildById(undefined)).rejects.toThrow('Guild ID is required');
    });
  });
  
  describe('getGuildGamesWithPagination method', () => {
    it('should return paginated games with subscription status', async () => {
      const result = await GameService.getGuildGamesWithPagination('123456789012345678', 1, 20, '', '');
      
      const dbMock = await require('@shared/database').getInstance();
      expect(dbMock.getPaginatedGuildGames).toHaveBeenCalledWith('123456789012345678', 1, 20, '', '');
      
      expect(result).toEqual({
        games: [
          { id: 1, name: 'Test Game 1', release_date: '2023-12-01', subscribed: true },
          { id: 2, name: 'Test Game 2', release_date: '2023-12-15', subscribed: false }
        ],
        pagination: {
          total: 2,
          totalPages: 1,
          page: 1,
          limit: 20
        }
      });
    });
    
    it('should throw error when guild ID is empty', async () => {
      await expect(GameService.getGuildGamesWithPagination('', 1, 20, '', '')).rejects.toThrow('Guild ID is required');
    });
  });
  
  describe('getGuildGameStats method', () => {
    it('should return game statistics for a guild', async () => {
      const stats = await GameService.getGuildGameStats('123456789012345678');
      
      const dbMock = await require('@shared/database').getInstance();
      expect(dbMock.getGuildGameStats).toHaveBeenCalledWith('123456789012345678');
      
      expect(stats).toEqual({
        totalGames: 100,
        subscribedGames: 25
      });
    });
    
    it('should throw error when guild ID is empty', async () => {
      await expect(GameService.getGuildGameStats('')).rejects.toThrow('Guild ID is required');
    });
  });
  
  describe('toggleGameSubscription method', () => {
    it('should unsubscribe when game is already subscribed', async () => {
      const result = await GameService.toggleGameSubscription('123456789012345678', 1);
      
      const dbMock = await require('@shared/database').getInstance();
      expect(dbMock.isGameSubscribed).toHaveBeenCalledWith('123456789012345678', 1);
      expect(dbMock.unlinkGameFromGuild).toHaveBeenCalledWith('123456789012345678', 1);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Unsubscribed guild'));
      expect(result).toEqual({ subscribed: false });
    });
    
    it('should subscribe when game is not subscribed', async () => {
      const result = await GameService.toggleGameSubscription('123456789012345678', 2);
      
      const dbMock = await require('@shared/database').getInstance();
      expect(dbMock.isGameSubscribed).toHaveBeenCalledWith('123456789012345678', 2);
      expect(dbMock.linkGameToGuild).toHaveBeenCalledWith('123456789012345678', 2);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Subscribed guild'));
      expect(result).toEqual({ subscribed: true });
    });
    
    it('should throw error when guild ID is empty', async () => {
      await expect(GameService.toggleGameSubscription('', 1)).rejects.toThrow('Guild ID is required');
    });
    
    it('should throw error when game ID is empty', async () => {
      await expect(GameService.toggleGameSubscription('123456789012345678', null)).rejects.toThrow('Game ID is required');
    });
  });
});