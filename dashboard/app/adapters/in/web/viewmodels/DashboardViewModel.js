/**
 * View model for the dashboard UI
 */
class DashboardViewModel {
    /**
     * @param {Object} user - The authenticated user
     * @param {Array} guilds - List of guilds the user has access to
     */
    constructor(user, guilds) {
        this.user = this.transformUser(user);
        this.guilds = this.transformGuilds(guilds);
    }

    /**
     * Transform user data for display
     * @param {Object} user - User data from Discord
     * @returns {Object} Transformed user data
     */
    transformUser(user) {
        if (!user) return null;

        return {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            avatarUrl: this.getAvatarUrl(user),
            tag: this.getUserTag(user)
        };
    }

    /**
     * Transform guild data for display
     * @param {Array} guilds - List of guild entities
     * @returns {Array} Transformed guild data
     */
    transformGuilds(guilds) {
        if (!guilds || !Array.isArray(guilds)) return [];

        return guilds.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            iconUrl: guild.getIconUrl ? guild.getIconUrl() : this.getGuildIconUrl(guild),
            hasBot: guild.hasBot || false,
            isAdmin: guild.hasAdminPermission ? guild.hasAdminPermission() : this.hasAdminPermission(guild)
        }));
    }

    /**
     * Get avatar URL for a user
     * @param {Object} user - User data
     * @returns {string|null} Avatar URL or null
     */
    getAvatarUrl(user) {
        if (!user || !user.avatar) return null;
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }

    /**
     * Get icon URL for a guild
     * @param {Object} guild - Guild data
     * @returns {string|null} Icon URL or null
     */
    getGuildIconUrl(guild) {
        if (!guild || !guild.icon) return null;
        return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
    }

    /**
     * Get user tag (username#discriminator or just username for new Discord format)
     * @param {Object} user - User data
     * @returns {string} User tag
     */
    getUserTag(user) {
        if (!user) return '';
        if (user.discriminator && user.discriminator !== '0') {
            return `${user.username}#${user.discriminator}`;
        }
        return user.username;
    }

    /**
     * Check if user has admin permission in guild
     * @param {Object} guild - Guild data
     * @returns {boolean} Whether user has admin permissions
     */
    hasAdminPermission(guild) {
        if (!guild || !guild.permissions) return false;
        return (guild.permissions & 0x8) === 0x8; // Check for ADMINISTRATOR permission
    }

    /**
     * Get the view model for rendering
     * @returns {Object} View model data
     */
    toViewModel() {
        return {
            user: this.user,
            guilds: this.guilds
        };
    }
}

module.exports = DashboardViewModel;