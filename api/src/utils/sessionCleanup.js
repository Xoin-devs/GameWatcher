/**
 * Utility to periodically clean up expired sessions
 */
const SessionService = require('../services/sessionService');
const config = require('../config');
const logger = require('@shared/logger');

class SessionCleanup {
    /**
     * Initialize the session cleanup task
     */
    static init() {
        if (!this.cleanupInterval) {
            const interval = config.session.cleanupInterval;
            logger.info(`Setting up session cleanup task to run every ${interval / 60000} minutes`);
            
            this.cleanupInterval = setInterval(() => this.cleanup(), interval);
            // Don't keep process alive just for session cleanup
            this.cleanupInterval.unref();
            
            // Run an initial cleanup on startup
            this.cleanup();
        }
    }
    
    /**
     * Clean up expired sessions
     * @returns {Promise<void>}
     */
    static async cleanup() {
        try {
            const count = await SessionService.clearExpiredSessions();
            logger.info(`Session cleanup completed: ${count} expired sessions removed`);
        } catch (error) {
            logger.error(`Error during session cleanup: ${error.message}`);
        }
    }
    
    /**
     * Stop the cleanup task
     */
    static stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            logger.info('Session cleanup task stopped');
        }
    }
}

module.exports = SessionCleanup;
