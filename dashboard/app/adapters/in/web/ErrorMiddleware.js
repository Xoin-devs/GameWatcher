const { ApplicationError } = require('../../../core/application/errors/ApplicationErrors');
const logger = require('@shared/logger');
const config = require('@shared/config');

/**
 * Middleware to handle application errors in a consistent way
 */
class ErrorMiddleware {
    /**
     * Create an error handling middleware function
     * @returns {Function} Express middleware function
     */
    static createErrorHandler() {
        return (err, req, res, next) => {
            // Log the error
            logger.error(`Error: ${err.message}`, err);
            
            // If this is one of our application errors
            if (err instanceof ApplicationError) {
                return res.status(err.statusCode).render('error', {
                    message: err.message,
                    error: {
                        status: err.statusCode,
                        stack: config.isDev() ? err.stack : ''
                    }
                });
            }
            
            // Handle API errors (AJAX requests)
            if (req.xhr || req.path.startsWith('/api/')) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }
            
            // Default error handling for regular requests
            res.status(500).render('error', {
                message: 'An unexpected error occurred',
                error: {
                    status: 500,
                    stack: config.isDev() ? err.stack : ''
                }
            });
        };
    }
}

module.exports = ErrorMiddleware;