const GameRepository = require('../../../core/domain/ports/out/GameRepository');
const GameMapper = require('./GameMapper');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const logger = require('@shared/logger');
const { NotFoundError, ApplicationError } = require('../../../core/application/errors/ApplicationErrors');

/**
 * Implementation of GameRepository that connects to the API
 */
class GameRepositoryImpl extends GameRepository {
    constructor() {
        super();
        // Get API URL from config
        const api_port = process.env.API_PORT || 8080;
        const api_endpoint = process.env.API_ENDPOINT || 'http://localhost';
        this.apiUrl = `${api_endpoint}:${api_port}/api`;
    }

    /**
     * @inheritdoc
     */
    async getGuildGames(guildId, page = 1, limit = 20, search = '', filter = '') {
        try {
            let url = `${this.apiUrl}/guilds/${guildId}/games?page=${page}&limit=${limit}`;
            
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            if (filter) {
                url += `&filter=${encodeURIComponent(filter)}`;
            }
            
            const response = await fetch(url);
            
            if (response.status === 404) {
                throw new NotFoundError(`Guild with ID ${guildId} not found`);
            }
            
            if (!response.ok) {
                throw new ApplicationError(`API responded with status: ${response.status}`);
            }
            
            const apiResponse = await response.json();
            
            // Transform API response to domain entities using the mapper
            return GameMapper.apiResponseToDomain(apiResponse.data);
        } catch (error) {
            logger.error(`Error fetching guild games: ${error.message}`);
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async getGuildGameStats(guildId) {
        try {
            const url = `${this.apiUrl}/guilds/${guildId}/stats`;
            
            const response = await fetch(url);
            
            if (response.status === 404) {
                throw new NotFoundError(`Stats API url not found, please check if the API supports this endpoint`);
            }
            
            if (!response.ok) {
                throw new ApplicationError(`API responded with status: ${response.status}`);
            }
            
            const stats = await response.json();
            return stats.data;
        } catch (error) {
            logger.error(`Error fetching guild game stats: ${error.message}`);
            
            // Return default stats if API doesn't support this endpoint yet
            if (error.statusCode = 404) {
                return { totalGames: 0, subscribedGames: 0 };
            }
            
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async linkGameToGuild(guildId, gameId) {
        try {
            const response = await fetch(`${this.apiUrl}/guilds/${guildId}/games/${gameId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 404) {
                throw new NotFoundError(`Guild or game not found`);
            }
            
            if (!response.ok) {
                throw new ApplicationError(`API responded with status: ${response.status}`);
            }
            
            return true;
        } catch (error) {
            logger.error(`Error linking game to guild: ${error.message}`);
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async unlinkGameFromGuild(guildId, gameId) {
        try {
            const response = await fetch(`${this.apiUrl}/guilds/${guildId}/games/${gameId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 404) {
                throw new NotFoundError(`Guild or game not found`);
            }
            
            if (!response.ok) {
                throw new ApplicationError(`API responded with status: ${response.status}`);
            }
            
            return true;
        } catch (error) {
            logger.error(`Error unlinking game from guild: ${error.message}`);
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async getGuilds() {
        try {
            const response = await fetch(`${this.apiUrl}/guilds`);
            
            if (!response.ok) {
                throw new ApplicationError(`API responded with status: ${response.status}`);
            }
            
            const guilds = await response.json();
            return guilds.data;
        } catch (error) {
            logger.error(`Error fetching guilds: ${error.message}`);
            throw error;
        }
    }
}

module.exports = GameRepositoryImpl;