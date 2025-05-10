const GameService = require('../services/gameService');
const logger = require('@shared/logger');

/**
 * Base controller with common error handling logic
 */
class BaseController {
    /**
     * Execute a controller function with standardized error handling
     * @param {Function} controllerFn - The controller function to execute 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    static async executeHandler(controllerFn, req, res, next) {
        try {
            await controllerFn(req, res);
        } catch (error) {
            logger.error(`Controller error: ${error.message}`);
            next(error);
        }
    }
}

/**
 * Game controller handling game-related operations
 * Now using service layer for business logic
 */
class GameController {
    /**
     * Get all guilds
     */
    static async getGuilds(req, res, next) {
        await BaseController.executeHandler(async () => {
            const guilds = await GameService.getAllGuilds();
            res.sendSuccess(guilds, 'Guilds retrieved successfully');
        }, req, res, next);
    }

    /**
     * Get details for a specific guild
     */
    static async getGuildDetails(req, res, next) {
        await BaseController.executeHandler(async () => {
            // Ensure guildId is treated as string to avoid BigInt issues
            const guildId = String(req.params.guildId);
            const guild = await GameService.getGuildById(guildId);
            
            if (!guild) {
                return res.sendError('Guild not found', 404);
            }
            
            res.sendSuccess(guild, 'Guild details retrieved successfully');
        }, req, res, next);
    }

    static async getAllGames(req, res, next) {
        await BaseController.executeHandler(async () => {
            const guild = await GameService.getGames();

            res.sendSuccess(guild, 'Guild details retrieved successfully');
        }, req, res, next);
    }

    /**
     * Get games with subscription status for a guild
     */
    static async getGamesWithSubscriptionStatus(req, res, next) {
        await BaseController.executeHandler(async () => {
            // Ensure guildId is treated as string to avoid BigInt issues
            const guildId = String(req.params.guildId);
            
            // Extract query parameters for pagination, search, and filtering
            const page = parseInt(req.query.page, 10) || 1;
            const limit = parseInt(req.query.limit, 10) || 20;
            const search = req.query.search || '';
            const filter = req.query.filter || '';
            
            const result = await GameService.getGuildGamesWithPagination(guildId, page, limit, search, filter);
            
            // Ensure we maintain the expected format structure that the dashboard expects
            res.sendSuccess({
                games: result.games,
                pagination: {
                    total: result.pagination.total,
                    totalPages: result.pagination.totalPages,
                    page: result.pagination.page,
                    limit: result.pagination.limit
                }
            }, 'Games retrieved successfully');
        }, req, res, next);
    }

    /**
     * Get game statistics for a guild
     */
    static async getGuildGameStats(req, res, next) {
        await BaseController.executeHandler(async () => {
            // Ensure guildId is treated as string to avoid BigInt issues
            const guildId = String(req.params.guildId);
            
            // Get count of games subscribed to by the guild
            const stats = await GameService.getGuildGameStats(guildId);
            
            res.sendSuccess(stats, 'Guild game statistics retrieved successfully');
        }, req, res, next);
    }

    /**
     * Toggle game subscription for a guild
     */
    static async toggleGameSubscription(req, res, next) {
        await BaseController.executeHandler(async () => {
            // Ensure guildId is treated as string to avoid BigInt issues
            const guildId = String(req.params.guildId);
            const gameId = req.params.gameId;
            
            const result = await GameService.toggleGameSubscription(guildId, gameId);
            
            const message = result.subscribed ? 
                'Game subscribed successfully' : 
                'Game unsubscribed successfully';
                
            res.sendSuccess(result, message);
        }, req, res, next);
    }
}

module.exports = {
    getGuilds: (req, res, next) => GameController.getGuilds(req, res, next),
    getAllGames: (req, res, next) => GameController.getAllGames(req, res, next),
    getGuildDetails: (req, res, next) => GameController.getGuildDetails(req, res, next),
    getGamesWithSubscriptionStatus: (req, res, next) => GameController.getGamesWithSubscriptionStatus(req, res, next),
    getGuildGameStats: (req, res, next) => GameController.getGuildGameStats(req, res, next),
    toggleGameSubscription: (req, res, next) => GameController.toggleGameSubscription(req, res, next)
};