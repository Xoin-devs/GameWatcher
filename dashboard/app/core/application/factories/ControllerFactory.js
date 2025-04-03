const AuthController = require('../../../adapters/in/web/AuthController');
const GuildController = require('../../../adapters/in/web/GuildController');
const GameController = require('../../../adapters/in/web/GameController');

/**
 * Factory for creating controller instances with proper dependencies
 */
class ControllerFactory {
    /**
     * Create instances of all web controllers
     * @param {Object} services - Object containing service instances
     * @returns {Object} Object containing all controller instances
     */
    static createControllers(services) {
        const { gameService, guildService, userService } = services;
        
        return {
            authController: new AuthController(),
            guildController: new GuildController(guildService, userService),
            gameController: new GameController(gameService)
        };
    }
}

module.exports = ControllerFactory;