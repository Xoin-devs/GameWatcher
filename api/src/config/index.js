/**
 * Configuration utility for the API
 * Extends shared config with API-specific settings
 */
const sharedConfig = require('@shared/config');
const logger = require('@shared/logger');

// Ensure the shared config is loaded first (which loads environment variables)
const config = {
    // Server configuration
    port: process.env.API_PORT || 8473,
    nodeEnv: process.env.NODE_ENV || 'dev',
    
    // CORS settings - Make sure to include all relevant origins with appropriate fallbacks
    corsOrigins: process.env.CORS_ORIGINS ? 
        process.env.CORS_ORIGINS.split(',') : 
        ['https://oslo.ovh', 'http://localhost:5173', 'http://localhost:4000', 'http://localhost:81', 'http://localhost:8080', '*'],
    
    // Include shared helper methods
    isProd: sharedConfig.isProd,
    isDev: sharedConfig.isDev,
    
    // Database configuration (read from environment)
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'mydatabase',
    },
    
    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || 'default-secret-key-change-in-production',
        cookie: {
            // Secure cookies in production only (requires HTTPS)
            secure: sharedConfig.isProd(),
            httpOnly: true,
            maxAge: parseInt(process.env.SESSION_MAX_AGE || 604800000, 10), // 7 days by default
            sameSite: 'lax'
        },
        resave: false,
        saveUninitialized: false,
        // Database sessions cleaning interval (in milliseconds)
        cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || 3600000, 10) // 1 hour by default
    }
};

// Log configuration on startup (excluding sensitive information)
logger.debug('API Configuration:', {
    port: config.port,
    environment: config.nodeEnv,
    corsOrigins: config.corsOrigins,
    dbHost: config.db.host,
    dbName: config.db.database,
    isProd: config.isProd(),
    sessionMaxAge: config.session.cookie.maxAge,
    sessionSecure: config.session.cookie.secure
});

module.exports = config;