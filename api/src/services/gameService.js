/**
 * Service for handling game-related business logic
 */
const BaseService = require('./baseService');
const logger = require('@shared/logger');

class GameService extends BaseService {
    /**
     * Get all guilds
     * @returns {Promise<Array>} List of guilds
     */
    static async getAllGuilds() {
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.getGuilds();
        }, 'getAllGuilds');
    }

    /**
     * Get a specific guild by ID
     * @param {string} guildId - The guild ID to fetch
     * @returns {Promise<Object|null>} Guild data or null if not found
     */
    static async getGuildById(guildId) {
        this.validateId(guildId, 'Guild ID');
        const safeGuildId = this.safelyConvertToString(guildId);
        
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.getGuild(safeGuildId);
        }, 'getGuildById', safeGuildId);
    }

    /**
     * Get all games
     * @returns {Promise<Object|null>} Games or null if not found
     */
    static async getGames() {
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.getGames();
        }, 'getGames');
    }

    /**
     * Get paginated games with subscription status for a guild
     * @param {string} guildId - The guild ID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {string} search - Search term
     * @param {string} filter - Filter option
     * @returns {Promise<Object>} Paginated game data
     */
    static async getGuildGamesWithPagination(guildId, page, limit, search, filter) {
        this.validateId(guildId, 'Guild ID');
        const safeGuildId = this.safelyConvertToString(guildId);
        
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.getPaginatedGuildGames(safeGuildId, page, limit, search, filter);
        }, 'getGuildGamesWithPagination', safeGuildId, page, limit, search, filter);
    }

    /**
     * Get game statistics for a guild
     * @param {string} guildId - The guild ID
     * @returns {Promise<Object>} Guild game statistics
     */
    static async getGuildGameStats(guildId) {
        this.validateId(guildId, 'Guild ID');
        const safeGuildId = this.safelyConvertToString(guildId);
        
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.getGuildGameStats(safeGuildId);
        }, 'getGuildGameStats', safeGuildId);
    }

    /**
     * Toggle game subscription for a guild
     * @param {string} guildId - The guild ID
     * @param {number} gameId - The game ID
     * @returns {Promise<Object>} Result of the operation
     */
    static async toggleGameSubscription(guildId, gameId) {
        this.validateId(guildId, 'Guild ID');
        this.validateId(gameId, 'Game ID');
        const safeGuildId = this.safelyConvertToString(guildId);
        
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            
            // Check if subscription exists
            const isSubscribed = await db.isGameSubscribed(safeGuildId, gameId);
            
            if (isSubscribed) {
                // If subscribed, unlink the game
                await db.unlinkGameFromGuild(safeGuildId, gameId);
                logger.info(`Unsubscribed guild ${safeGuildId} from game ${gameId}`);
                return { subscribed: false };
            } else {
                // If not subscribed, link the game
                await db.linkGameToGuild(safeGuildId, gameId);
                logger.info(`Subscribed guild ${safeGuildId} to game ${gameId}`);
                return { subscribed: true };
            }
        }, 'toggleGameSubscription', safeGuildId, gameId);
    }
}

module.exports = GameService;