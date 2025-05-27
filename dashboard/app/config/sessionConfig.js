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
        sameSite: isProduction ? 'none' : 'lax' // Use 'none' only in production, 'lax' in development
    };
    
    // Only use secure cookies in production
    if (isProduction) {
        logger.info('Production environment detected - using secure cookies');
        cookieConfig.secure = true;
        
        // Add domain setting for production to ensure cookies work across subdomains
        const domain = process.env.COOKIE_DOMAIN || 'oslo.ovh';
        if (!domain) {
            logger.error('COOKIE_DOMAIN is not set in production!');
        } else {
            logger.info(`Setting cookie domain to: ${domain}`);
            cookieConfig.domain = domain;
        }
    } else {
        logger.info('Development environment detected - NOT using secure cookies');
        cookieConfig.secure = false;
    }
    
    logger.debug('Cookie configuration:', cookieConfig);
    return cookieConfig;
}

module.exports = {
    getSessionCookieConfig
};
