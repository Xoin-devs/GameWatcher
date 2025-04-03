/**
 * Port interface for accessing guild information from external systems
 */
class GuildPort {
    /**
     * Get all guilds where the bot is installed
     * @returns {Promise<Array>} List of guilds
     */
    async getGuilds() {
        throw new Error('Method not implemented');
    }

    /**
     * Get detailed information about a guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<Object>} Guild details
     */
    async getGuildDetails(guildId) {
        throw new Error('Method not implemented');
    }
}

module.exports = GuildPort;