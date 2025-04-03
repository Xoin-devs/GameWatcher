/**
 * Port interface for retrieving user information
 */
class UserPort {
    /**
     * Get user information by ID
     * @param {string} userId - User's Discord ID
     * @returns {Promise<Object>} User information
     */
    async getUserById(userId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get user profile with guilds
     * @param {Object} user - User object with access token
     * @returns {Promise<Object>} User profile with accessible guilds
     */
    async getUserProfile(user) {
        throw new Error('Method not implemented');
    }
}

module.exports = UserPort;