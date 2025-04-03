import apiClient from '../adapters/apiClient.js';

/**
 * Service for game-related operations
 * Handles business logic for games in the frontend
 */
class GameService {
    /**
     * Get games for a guild with pagination, search, and filtering
     * @param {string} guildId - Guild ID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {string} search - Search term
     * @param {string} filter - Filter criteria
     * @returns {Promise<Object>} - Games with pagination info
     */
    async getGuildGames(guildId, page = 1, limit = 20, search = '', filter = '') {
        return apiClient.getGuildGames(guildId, page, limit, search, filter);
    }
    
    /**
     * Get game statistics for a guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<Object>} - Game statistics
     */
    async getGuildStats(guildId) {
        return apiClient.getGuildStats(guildId);
    }
    
    /**
     * Toggle game subscription
     * @param {string} guildId - Guild ID
     * @param {string} gameId - Game ID
     * @param {boolean} subscribe - Whether to subscribe or unsubscribe
     * @returns {Promise<Object>} - Success response
     */
    async toggleSubscription(guildId, gameId, subscribe) {
        return apiClient.toggleGameSubscription(guildId, gameId, subscribe);
    }
}

// Export as singleton
const gameService = new GameService();
export default gameService;