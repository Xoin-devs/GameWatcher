const GameRepository = require('../../../core/domain/ports/out/GameRepository');
const GameMapper = require('./GameMapper');
const axios = require('axios');
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
        
        // For production with custom domain, don't add port to the URL
        if (api_endpoint.includes('https://') && !api_endpoint.includes('localhost')) {
            this.apiUrl = `${api_endpoint}/api`;
        } else {
            this.apiUrl = `${api_endpoint}:${api_port}/api`;
        }
        
        logger.debug(`GameRepository initialized with API URL: ${this.apiUrl}`);
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
            
            const response = await axios.get(url);
            
            // Transform API response to domain entities using the mapper
            return GameMapper.apiResponseToDomain(response.data.data);
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new NotFoundError(`Guild with ID ${guildId} not found`);
                }
                throw new ApplicationError(`API responded with status: ${error.response.status}`);
            }
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
            
            const response = await axios.get(url);
            
            return response.data.data;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    logger.error(`Stats API url not found, please check if the API supports this endpoint`);
                    return { totalGames: 0, subscribedGames: 0 };
                }
                throw new ApplicationError(`API responded with status: ${error.response.status}`);
            }
            logger.error(`Error fetching guild game stats: ${error.message}`);
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async linkGameToGuild(guildId, gameId) {
        try {
            const response = await axios.post(`${this.apiUrl}/guilds/${guildId}/games/${gameId}/toggle`);
            
            return true;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new NotFoundError(`Guild or game not found`);
                }
                throw new ApplicationError(`API responded with status: ${error.response.status}`);
            }
            logger.error(`Error linking game to guild: ${error.message}`);
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async unlinkGameFromGuild(guildId, gameId) {
        try {
            const response = await axios.post(`${this.apiUrl}/guilds/${guildId}/games/${gameId}/toggle`);
            
            return true;
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    throw new NotFoundError(`Guild or game not found`);
                }
                throw new ApplicationError(`API responded with status: ${error.response.status}`);
            }
            logger.error(`Error unlinking game from guild: ${error.message}`);
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async getGuilds() {
        try {
            const response = await axios.get(`${this.apiUrl}/guilds`);
            
            return response.data.data;
        } catch (error) {
            if (error.response) {
                throw new ApplicationError(`API responded with status: ${error.response.status}`);
            }
            logger.error(`Error fetching guilds: ${error.message}`);
            throw error;
        }
    }
}

module.exports = GameRepositoryImpl;