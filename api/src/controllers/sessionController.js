/**
 * Controller for session management endpoints
 */
const SessionService = require('../services/sessionService');
const logger = require('@shared/logger');

/**
 * Base controller with common error handling logic
 */
class BaseController {
    /**
     * Execute a controller function with standardized error handling
     * @param {Function} controllerFn - The controller function to execute 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    static async executeHandler(controllerFn, req, res, next) {
        try {
            await controllerFn(req, res);
        } catch (error) {
            logger.error(`Controller error: ${error.message}`);
            next(error);
        }
    }
}

/**
 * Session controller handling session-related operations
 */
class SessionController {
    /**
     * Get session by ID
     */
    static async getSession(req, res, next) {
        await BaseController.executeHandler(async () => {
            const sessionId = req.params.sessionId;
            const session = await SessionService.getSession(sessionId);
            
            if (!session) {
                return res.sendError('Session not found', 404);
            }
            
            res.sendSuccess(session, 'Session retrieved successfully');
        }, req, res, next);
    }

    /**
     * Set or update a session
     */
    static async setSession(req, res, next) {
        await BaseController.executeHandler(async () => {
            const { sessionId } = req.params;
            const { data, maxAge } = req.body;
            
            if (!data || !maxAge || typeof maxAge !== 'number') {
                return res.sendError('Session data and maxAge are required', 400);
            }
            
            const result = await SessionService.setSession(sessionId, data, maxAge);
            
            if (!result) {
                return res.sendError('Failed to store session', 500);
            }
            
            res.sendSuccess({ success: true }, 'Session stored successfully');
        }, req, res, next);
    }

    /**
     * Destroy a session
     */
    static async destroySession(req, res, next) {
        await BaseController.executeHandler(async () => {
            const { sessionId } = req.params;
            
            const result = await SessionService.destroySession(sessionId);
            
            if (!result) {
                return res.sendError('Failed to destroy session', 500);
            }
            
            res.sendSuccess({ success: true }, 'Session destroyed successfully');
        }, req, res, next);
    }

    /**
     * Clean up expired sessions
     */
    static async clearExpiredSessions(req, res, next) {
        await BaseController.executeHandler(async () => {
            const count = await SessionService.clearExpiredSessions();
            res.sendSuccess({ count }, `Cleared ${count} expired sessions`);
        }, req, res, next);
    }
}

module.exports = {
    getSession: (req, res, next) => SessionController.getSession(req, res, next),
    setSession: (req, res, next) => SessionController.setSession(req, res, next),
    destroySession: (req, res, next) => SessionController.destroySession(req, res, next),
    clearExpiredSessions: (req, res, next) => SessionController.clearExpiredSessions(req, res, next)
};
