/**
 * Middleware for handling validation errors from express-validator
 */
const { validationResult } = require('express-validator');
const logger = require('@shared/logger');

/**
 * Checks for validation errors and returns a 400 response if any are found
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function validationHandler(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const validationErrors = errors.array();
        logger.warn(`Validation failed: ${JSON.stringify(validationErrors)}`);
        
        return res.sendError(
            'Validation failed',
            400,
            {
                errors: validationErrors.map(error => ({
                    parameter: error.param,
                    message: error.msg,
                    value: error.value
                }))
            }
        );
    }
    
    next();
}

module.exports = validationHandler;
