/**
 * Port interface for retrieving game information
 */
class GamePort {
    /**
     * Get paginated games with their subscription status for a specific guild
     * @param {string} guildId - Guild ID
     * @param {number} page - Page number
     * @param {number} limit - Limit per page
     * @param {string} search - Search term
     * @param {string} filter - Filter by subscription status
     * @returns {Promise<Object>} Games and pagination information
     */
    async getGuildGames(guildId, page = 1, limit = 20, search = '', filter = '') {
        throw new Error('Method not implemented');
    }

    /**
     * Get statistics about subscribed games for a guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<Object>} Stats object containing total counts
     */
    async getGuildGameStats(guildId) {
        throw new Error('Method not implemented');
    }

    /**
     * Subscribe to a game for a guild
     * @param {string} guildId - Guild ID
     * @param {string} gameId - Game ID 
     * @returns {Promise<boolean>} Success status
     */
    async subscribeToGame(guildId, gameId) {
        throw new Error('Method not implemented');
    }

    /**
     * Unsubscribe from a game for a guild
     * @param {string} guildId - Guild ID
     * @param {string} gameId - Game ID
     * @returns {Promise<boolean>} Success status
     */
    async unsubscribeFromGame(guildId, gameId) {
        throw new Error('Method not implemented');
    }
}

module.exports = GamePort;