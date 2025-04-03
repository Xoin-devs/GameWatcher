/**
 * Represents a Discord User entity in the domain
 */
class User {
    constructor(id, username, discriminator, avatar, accessToken, refreshToken) {
        this.id = id;
        this.username = username;
        this.discriminator = discriminator;
        this.avatar = avatar;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
    }

    /**
     * Get the user's avatar URL
     * @returns {string|null} The avatar URL or null if no avatar
     */
    getAvatarUrl() {
        if (!this.avatar) return null;
        return `https://cdn.discordapp.com/avatars/${this.id}/${this.avatar}.png`;
    }

    /**
     * Get the user's display name (tag)
     * @returns {string} The user's display name (username#discriminator)
     */
    getTag() {
        if (this.discriminator && this.discriminator !== '0') {
            return `${this.username}#${this.discriminator}`;
        }
        return this.username;
    }
}

module.exports = User;