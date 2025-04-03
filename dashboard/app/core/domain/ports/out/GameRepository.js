/**
 * Repository interface for accessing game data
 */
class GameRepository {
    /**
     * Get paginated games with subscription status for a guild
     * @param {string} guildId - Guild ID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {string} search - Search term
     * @param {string} filter - Subscription filter
     * @returns {Promise<Object>} Games with pagination info
     */
    async getGuildGames(guildId, page = 1, limit = 20, search = '', filter = '') {
        throw new Error('Method not implemented');
    }

    /**
     * Get statistics about games for a guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<Object>} Game statistics for the guild
     */
    async getGuildGameStats(guildId) {
        throw new Error('Method not implemented');
    }

    /**
     * Link a game to a guild (subscribe)
     * @param {string} guildId - Guild ID
     * @param {string} gameId - Game ID
     * @returns {Promise<boolean>} Success status
     */
    async linkGameToGuild(guildId, gameId) {
        throw new Error('Method not implemented');
    }

    /**
     * Unlink a game from a guild (unsubscribe)
     * @param {string} guildId - Guild ID
     * @param {string} gameId - Game ID
     * @returns {Promise<boolean>} Success status
     */
    async unlinkGameFromGuild(guildId, gameId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all guilds where the bot is installed
     * @returns {Promise<Array>} List of guilds
     */
    async getGuilds() {
        throw new Error('Method not implemented');
    }
}

module.exports = GameRepository;