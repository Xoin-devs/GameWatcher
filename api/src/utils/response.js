/**
 * Response utility to standardize API responses
 */

/**
 * Create a standardized successful response
 * @param {*} data - The data to include in the response
 * @param {string} message - Optional success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Standardized success response
 */
const success = (data, message = 'Operation successful', statusCode = 200) => {
    return {
        success: true,
        message,
        statusCode,
        data
    };
};

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {*} errors - Optional additional error details
 * @returns {Object} Standardized error response
 */
const error = (message = 'An error occurred', statusCode = 400, errors = null) => {
    const response = {
        success: false,
        message,
        statusCode
    };

    if (errors) {
        response.errors = errors;
    }

    return response;
};

/**
 * Express middleware that adds response helpers to the res object
 */
const responseMiddleware = (req, res, next) => {
    // Add success response helper
    res.sendSuccess = (data, message, statusCode = 200) => {
        return res.status(statusCode).json(success(data, message, statusCode));
    };

    // Add error response helper
    res.sendError = (message, statusCode = 400, errors = null) => {
        return res.status(statusCode).json(error(message, statusCode, errors));
    };

    next();
};

module.exports = {
    success,
    error,
    responseMiddleware
};