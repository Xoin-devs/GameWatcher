/**
 * Repository interface for accessing Discord-related data
 */
class DiscordRepository {
    /**
     * Fetch guild details from Discord API
     * @param {string} guildId - Guild ID to fetch
     * @param {string} botToken - Discord bot token for authentication
     * @returns {Promise<Object>} Guild details from Discord
     */
    async fetchGuildDetails(guildId, botToken) {
        throw new Error('Method not implemented');
    }

    /**
     * Fetch a user's guilds from Discord API
     * @param {string} accessToken - User's Discord access token
     * @returns {Promise<Array>} List of guilds the user has access to
     */
    async fetchUserGuilds(accessToken) {
        throw new Error('Method not implemented');
    }
}

module.exports = DiscordRepository;