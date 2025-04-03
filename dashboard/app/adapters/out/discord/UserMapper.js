const User = require('../../../core/domain/entities/User');

/**
 * Mapper to convert between Discord API responses and user domain entities
 */
class UserMapper {
    /**
     * Convert Discord API user data to domain User entity
     * @param {Object} userData - User data from Discord API
     * @returns {User|null} Domain User entity or null
     */
    static toDomain(userData) {
        if (!userData) return null;
        
        return new User(
            userData.id,
            userData.username,
            userData.discriminator,
            userData.avatar,
            userData.accessToken,
            userData.refreshToken
        );
    }

    /**
     * Convert domain User entity to a data transfer object for the view
     * @param {User} user - Domain User entity
     * @returns {Object|null} User DTO for the view
     */
    static toDTO(user) {
        if (!user) return null;
        
        return {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            avatarUrl: user.getAvatarUrl ? user.getAvatarUrl() : this.getAvatarUrl(user),
            tag: user.getTag ? user.getTag() : this.getUserTag(user)
        };
    }

    /**
     * Helper method to get avatar URL for a user
     * @param {Object} user - User data
     * @returns {string|null} Avatar URL or null
     */
    static getAvatarUrl(user) {
        if (!user || !user.avatar) return null;
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    }

    /**
     * Helper method to get user tag
     * @param {Object} user - User data
     * @returns {string} User tag
     */
    static getUserTag(user) {
        if (!user) return '';
        if (user.discriminator && user.discriminator !== '0') {
            return `${user.username}#${user.discriminator}`;
        }
        return user.username;
    }
}

module.exports = UserMapper;