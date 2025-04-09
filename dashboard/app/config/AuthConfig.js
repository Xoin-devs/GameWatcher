const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const ApiSessionStore = require('./ApiSessionStore');
const path = require('path');
const logger = require('@shared/logger');
const config = require('@shared/config');
const { getSessionCookieConfig } = require('./sessionConfig');

/**
 * Configuration for authentication
 */
class AuthConfig {
    /**
     * @param {Express.Application} app - Express application
     */
    constructor(app) {
        this.app = app;
    }

    /**
     * Setup Passport with Discord strategy
     */
    setupPassport() {
        // Setup Discord Strategy
        passport.use(new Strategy({
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_CALLBACK_URL,
            scope: ['identify', 'guilds']
        }, (accessToken, refreshToken, profile, done) => {
            // We're not storing users in DB, just using session
            profile.accessToken = accessToken;
            return done(null, profile);
        }));

        // Serialization
        passport.serializeUser((user, done) => {
            done(null, user);
        });

        passport.deserializeUser((obj, done) => {
            done(null, obj);
        });
    }    /**
     * Configure session and authentication middleware
     */
    setupSession() {
        try {
            // Get the cookie configuration based on environment
            const cookieConfig = getSessionCookieConfig();
            
            // Create an API session store instance with caching
            const store = new ApiSessionStore({
                // Clean up expired sessions every hour
                cleanupInterval: 60 * 60 * 1000,
                // Use the same TTL as the cookie max age
                ttl: cookieConfig.maxAge,
                // Cache settings to reduce API calls
                cacheTTL: 30000, // 30 seconds cache for session data
                cacheCleanupInterval: 300000 // Clean up cache every 5 minutes
            });
            
            // Session configuration
            const sessionConfig = {
                store: store,
                secret: process.env.SESSION_SECRET || 'your-secret-key',
                resave: false,
                saveUninitialized: false,
                cookie: cookieConfig
            };

            this.app.use(session(sessionConfig));
            this.app.use(passport.initialize());
            this.app.use(passport.session());

            logger.info(`Session and passport middleware set up successfully with API storage (secure cookies: ${cookieConfig.secure})`);
        } catch (error) {
            logger.error(`Critical error setting up session: ${error.message}`, error);
            throw error; // Re-throw to be caught by the init method
        }
    }

    /**
     * Initialize authentication config
     */
    init() {
        this.setupSession();
        this.setupPassport();
    }
}

module.exports = AuthConfig;