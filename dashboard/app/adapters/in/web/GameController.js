const GameViewModel = require('./viewmodels/GameViewModel');

/**
 * Controller for game-related web routes
 */
class GameController {
    /**
     * @param {import('../../../core/domain/ports/in/GamePort')} gameService 
     */
    constructor(gameService) {
        this.gameService = gameService;
    }

    /**
     * Handle subscription toggle for a game
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    async toggleGameSubscription(req, res, next) {
        try {
            const { guildId, gameId } = req.params;
            const { subscribe } = req.body;

            if (subscribe) {
                await this.gameService.subscribeToGame(guildId, gameId);
                res.json({ success: true, subscribed: true });
            } else {
                await this.gameService.unsubscribeFromGame(guildId, gameId);
                res.json({ success: true, subscribed: false });
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get games for a guild with pagination, search and filtering
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    async getGuildGames(req, res, next) {
        try {
            const { guildId } = req.params;
            const { page = 1, limit = 20, search = '', filter = '' } = req.query;
            
            const gamesData = await this.gameService.getGuildGames(
                guildId, 
                parseInt(page, 10), 
                parseInt(limit, 10), 
                search, 
                filter
            );
            
            // Transform domain entities to view model
            const viewModel = new GameViewModel(
                gamesData.games,
                gamesData.pagination
            );
            
            res.json(viewModel.toViewModel());
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get game statistics for a guild
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    async getGuildGameStats(req, res, next) {
        try {
            const { guildId } = req.params;
            const stats = await this.gameService.getGuildGameStats(guildId);
            res.json(stats);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = GameController;