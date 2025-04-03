const GamePort = require('../../domain/ports/in/GamePort');

/**
 * Implementation of GamePort for application service layer
 */
class GameService extends GamePort {
    /**
     * @param {import('../../domain/ports/out/GameRepository')} gameRepository
     */
    constructor(gameRepository) {
        super();
        this.gameRepository = gameRepository;
    }

    /**
     * @inheritdoc
     */
    async getGuildGames(guildId, page = 1, limit = 20, search = '', filter = '') {
        return await this.gameRepository.getGuildGames(guildId, page, limit, search, filter);
    }

    /**
     * @inheritdoc
     */
    async getGuildGameStats(guildId) {
        return await this.gameRepository.getGuildGameStats(guildId);
    }

    /**
     * @inheritdoc
     */
    async subscribeToGame(guildId, gameId) {
        return await this.gameRepository.linkGameToGuild(guildId, gameId);
    }

    /**
     * @inheritdoc
     */
    async unsubscribeFromGame(guildId, gameId) {
        return await this.gameRepository.unlinkGameFromGuild(guildId, gameId);
    }
}

module.exports = GameService;