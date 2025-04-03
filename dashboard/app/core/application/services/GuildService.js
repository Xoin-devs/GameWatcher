const GuildPort = require('../../domain/ports/in/GuildPort');
const GuildMapper = require('../../../adapters/out/persistence/GuildMapper');
const { NotFoundError } = require('../errors/ApplicationErrors');

/**
 * Implementation of GuildPort for application service layer
 */
class GuildService extends GuildPort {
    /**
     * @param {import('../../domain/ports/out/GameRepository')} gameRepository 
     * @param {import('../../domain/ports/out/DiscordRepository')} discordRepository
     */
    constructor(gameRepository, discordRepository) {
        super();
        this.gameRepository = gameRepository;
        this.discordRepository = discordRepository;
    }

    /**
     * @inheritdoc
     */
    async getGuilds() {
        try {
            const guilds = await this.gameRepository.getGuilds();
            return GuildMapper.toDomainList(guilds);
        } catch (error) {
            throw error;
        }
    }

    /**
     * @inheritdoc
     */
    async getGuildDetails(guildId) {
        if (!guildId) {
            throw new NotFoundError('Guild ID is required');
        }
        
        try {
            const guildData = await this.discordRepository.fetchGuildDetails(
                guildId, 
                process.env.DISCORD_TOKEN
            );
            
            if (!guildData) {
                throw new NotFoundError(`Guild with ID ${guildId} not found`);
            }
            
            return guildData; // Already mapped to domain entity in the repository
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new Error(`Failed to get guild details: ${error.message}`);
        }
    }
}

module.exports = GuildService;