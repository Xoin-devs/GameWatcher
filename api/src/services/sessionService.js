/**
 * Service for handling session-related business logic
 */
const BaseService = require('./baseService');
const logger = require('@shared/logger');

class SessionService extends BaseService {
    /**
     * Get a session by ID
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object|null>} Session data or null if not found
     */
    static async getSession(sessionId) {
        this.validateId(sessionId, 'Session ID');
        
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.getSession(sessionId);
        }, 'getSession', sessionId);
    }

    /**
     * Set a new session or update an existing one
     * @param {string} sessionId - Session ID
     * @param {string} data - Session data as JSON string
     * @param {number} maxAge - Session max age in milliseconds
     * @returns {Promise<boolean>} Success status
     */
    static async setSession(sessionId, data, maxAge) {
        this.validateId(sessionId, 'Session ID');
        
        if (!data) {
            throw new Error('Session data is required');
        }
        
        if (!maxAge || typeof maxAge !== 'number') {
            throw new Error('Session max age is required and must be a number');
        }
        
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.setSession(sessionId, data, maxAge);
        }, 'setSession', sessionId);
    }

    /**
     * Destroy a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<boolean>} Success status
     */
    static async destroySession(sessionId) {
        this.validateId(sessionId, 'Session ID');
        
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.destroySession(sessionId);
        }, 'destroySession', sessionId);
    }
    
    /**
     * Clear expired sessions
     * @returns {Promise<number>} Number of sessions cleared
     */
    static async clearExpiredSessions() {
        return this.executeMethod(async () => {
            const db = await this.getDatabase();
            return await db.clearExpiredSessions();
        }, 'clearExpiredSessions');
    }
}

module.exports = SessionService;
