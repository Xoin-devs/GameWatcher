const UserPort = require('../../domain/ports/in/UserPort');
const { UnauthorizedError } = require('../errors/ApplicationErrors');

/**
 * Implementation of UserPort for application service layer
 */
class UserService extends UserPort {
    /**
     * @param {import('../../domain/ports/out/DiscordRepository')} discordRepository
     */
    constructor(discordRepository) {
        super();
        this.discordRepository = discordRepository;
    }

    /**
     * @inheritdoc
     */
    async getUserById(userId) {
        // We don't currently use this method, but it's part of the interface
        return null;
    }

    /**
     * @inheritdoc
     */
    async getUserProfile(user) {
        if (!user || !user.accessToken) {
            throw new UnauthorizedError('User authentication required');
        }
        
        try {
            // Fetch the user's guilds from Discord API
            const guilds = await this.discordRepository.fetchUserGuilds(user.accessToken);
            
            // Return user with guilds
            return {
                ...user,
                guilds
            };
        } catch (error) {
            // Re-throw if already an application error, otherwise wrap
            if (error instanceof UnauthorizedError) {
                throw error;
            }
            throw new Error(`Error fetching user profile: ${error.message}`);
        }
    }
}

module.exports = UserService;