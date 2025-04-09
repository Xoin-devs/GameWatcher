/**
 * Session configuration utility
 */
const logger = require('@shared/logger');
const config = require('@shared/config');

/**
 * Get appropriate session cookie configuration based on environment
 * @returns {Object} Cookie configuration object
 */
function getSessionCookieConfig() {
    const isProduction = config.isProd();
    
    const cookieConfig = {
        httpOnly: true,
        maxAge: parseInt(process.env.SESSION_MAX_AGE || 604800000, 10), // 7 days by default
        sameSite: 'lax'
    };
    
    // Only use secure cookies in production
    if (isProduction) {
        logger.info('Production environment detected - using secure cookies');
        cookieConfig.secure = true;
    } else {
        logger.info('Development environment detected - NOT using secure cookies');
        cookieConfig.secure = false;
    }
    
    return cookieConfig;
}

module.exports = {
    getSessionCookieConfig
};
