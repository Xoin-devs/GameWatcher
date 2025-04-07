/**
 * Mock implementation of the DatabaseManager
 * This mock can be used in tests to avoid actual database connections
 */

// Mock database singleton instance
const dbMock = {
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
  unlinkGameFromGuild: jest.fn().mockResolvedValue(true),
  
  // Helper functions used by services
  _validateDateFormat: jest.fn().mockImplementation((date) => date),
  _ensureString: jest.fn().mockImplementation((id) => id ? String(id) : null),
  _safeQuery: jest.fn().mockImplementation((query, params, errorMessage) => Promise.resolve({}))
};

// Export mock implementation
const DatabaseManagerMock = {
  getInstance: jest.fn().mockResolvedValue(dbMock)
};

module.exports = DatabaseManagerMock;