const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const logger = require('@shared/logger');

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
    }

    /**
     * Configure session and authentication middleware
     */
    setupSession() {
        try {
            // Session configuration
            const sessionConfig = {
                store: new SQLiteStore,
                secret: process.env.SESSION_SECRET || 'your-secret-key',
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: process.env.NODE_ENV === 'prod',
                    httpOnly: true,
                    maxAge: 604800000, // 7 days
                    sameSite: 'lax'
                }
            };

            this.app.use(session(sessionConfig));
            this.app.use(passport.initialize());
            this.app.use(passport.session());

            logger.info('Session and passport middleware set up successfully');
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