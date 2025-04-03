const GameService = require('../services/GameService');
const GuildService = require('../services/GuildService');
const UserService = require('../services/UserService');
const DiscordRepositoryImpl = require('../../../adapters/out/discord/DiscordRepositoryImpl');
const GameRepositoryImpl = require('../../../adapters/out/persistence/GameRepositoryImpl');

/**
 * Factory for creating service instances with proper dependencies
 */
class ServiceFactory {
    /**
     * Create instances of all application services
     * @returns {Object} Object containing all service instances
     */
    static createServices() {
        // Create repositories
        const gameRepository = new GameRepositoryImpl();
        const discordRepository = new DiscordRepositoryImpl();
        
        // Create and return services
        return {
            gameService: new GameService(gameRepository),
            guildService: new GuildService(gameRepository, discordRepository),
            userService: new UserService(discordRepository)
        };
    }
}

module.exports = ServiceFactory;