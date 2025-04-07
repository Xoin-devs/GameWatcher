/**
 * Middleware to check if the user has permission to access a specific guild
 */
class GuildAuthMiddleware {
    /**
     * @param {import('../../../../core/domain/ports/in/UserPort')} userService 
     * @param {import('../../../../core/domain/ports/in/GuildPort')} guildService
     */
    constructor(userService, guildService) {
        this.userService = userService;
        this.guildService = guildService;
        this.botGuildsCache = null;
        this.botGuildsCacheExpiry = null;
        this.userGuildsCache = new Map(); // Map of userId -> {guilds, expiry}
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
    }

    /**
     * Check if user has permission to access a guild
     * @returns {Function} Express middleware
     */
    checkGuildPermission() {
        return async (req, res, next) => {
            try {
                // Ensure user is authenticated
                if (!req.isAuthenticated() || !req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Unauthorized'
                    });
                }

                // Get the guild ID from the request parameters
                const { guildId } = req.params;
                
                if (!guildId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Guild ID is required'
                    });
                }

                // Get bot guilds (from cache if available)
                const botGuilds = await this.getBotGuilds();
                
                // Quick check if the bot is even in this guild before doing user checks
                const botInGuild = botGuilds.some(guild => guild.id === guildId);
                if (!botInGuild) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bot is not in this guild'
                    });
                }

                // Get the user's authorized guilds (from cache if available)
                const userGuilds = await this.getUserGuilds(req.user);
                
                // Check if the user has admin permissions for this guild
                const hasPermission = userGuilds.some(guild => 
                    guild.id === guildId && guild.hasAdminPermission()
                );

                if (!hasPermission) {
                    return res.status(403).json({
                        success: false,
                        message: 'You do not have permission to access this guild'
                    });
                }

                // User has permission, continue to the next middleware
                next();
            } catch (error) {
                console.error('Guild auth middleware error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Internal server error during authorization'
                });
            }
        };
    }

    /**
     * Get bot guilds with caching
     * @returns {Promise<Array>} List of bot guilds
     */
    async getBotGuilds() {
        const now = Date.now();
        
        // Return cached value if valid
        if (this.botGuildsCache && this.botGuildsCacheExpiry && this.botGuildsCacheExpiry > now) {
            return this.botGuildsCache;
        }
        
        // Fetch fresh data
        const guilds = await this.guildService.getGuilds();
        
        // Update cache
        this.botGuildsCache = guilds;
        this.botGuildsCacheExpiry = now + this.CACHE_TTL;
        
        return guilds;
    }

    /**
     * Get user guilds with caching
     * @param {Object} user - User object
     * @returns {Promise<Array>} List of user guilds
     */
    async getUserGuilds(user) {
        const now = Date.now();
        const userId = user.id;
        
        // Return cached value if valid
        const cachedData = this.userGuildsCache.get(userId);
        if (cachedData && cachedData.expiry > now) {
            return cachedData.guilds;
        }
        
        // Fetch fresh data
        const userWithGuilds = await this.userService.getUserProfile(user);
        
        if (!userWithGuilds || !userWithGuilds.guilds) {
            throw new Error('Failed to load user guilds');
        }
        
        // Update cache
        this.userGuildsCache.set(userId, {
            guilds: userWithGuilds.guilds,
            expiry: now + this.CACHE_TTL
        });
        
        return userWithGuilds.guilds;
    }
}

module.exports = GuildAuthMiddleware;