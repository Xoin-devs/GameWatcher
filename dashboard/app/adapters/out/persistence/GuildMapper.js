const Guild = require('../../../core/domain/entities/Guild');

/**
 * Maps data between API/persistence formats and domain guild entities
 */
class GuildMapper {
    /**
     * Convert API guild data to domain Guild entity
     * @param {Object} guildData - Guild data from API or Discord
     * @returns {Guild} Domain Guild entity
     */
    static toDomain(guildData) {
        if (!guildData) return null;
        
        return new Guild(
            guildData.id,
            guildData.name,
            guildData.icon,
            guildData.permissions || 0,
            guildData.webhook_url || null,
            guildData.channel_id || null
        );
    }
    
    /**
     * Convert an array of API guild data to domain Guild entities
     * @param {Array} guildDataArray - Array of guild data from API
     * @returns {Array<Guild>} Array of domain Guild entities
     */
    static toDomainList(guildDataArray) {
        if (!guildDataArray || !Array.isArray(guildDataArray)) return [];
        
        return guildDataArray
            .map(guildData => this.toDomain(guildData))
            .filter(Boolean); // Remove null entries
    }
    
    /**
     * Enrich guild data with bot-related information
     * @param {Array} userGuilds - Array of guilds from user
     * @param {Array} botGuilds - Array of guilds where the bot is installed
     * @returns {Array} Enriched guild data with hasBot flag
     */
    static enrichWithBotData(userGuilds, botGuilds) {
        if (!userGuilds || !botGuilds) return [];
        
        const botGuildIds = botGuilds.map(g => g.id);
        
        return userGuilds.map(guild => ({
            ...guild,
            hasBot: botGuildIds.includes(guild.id)
        }));
    }
}

module.exports = GuildMapper;