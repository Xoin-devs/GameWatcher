const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const https = require('https');
const helmet = require('helmet');
const crypto = require('crypto');
const DatabaseManager = require('@shared/database');
const logger = require('@shared/logger');
const config = require('@shared/config');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

class WebServer {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupAuth();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Get API URL for CSP configuration
        const api_port = process.env.API_PORT || 8080;
        const api_endpoint = process.env.API_ENDPOINT || 'http://localhost';
        const apiUrl = `${api_endpoint}:${api_port}`;

        // Generate a secure nonce for inline scripts
        this.app.use((req, res, next) => {
            res.locals.nonce = crypto.randomBytes(16).toString('base64');
            next();
        });

        // Add security headers with helmet
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "https://cdn.discordapp.com", "data:"],
                    connectSrc: ["'self'", apiUrl]
                }
            }
        }));

        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Serve images from the img directory with directory browsing disabled
        this.app.use('/img', express.static(path.join(__dirname, 'img'), {
            index: false,  // Disable directory index generation
            setHeaders: (res) => {
                res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            }
        }));
        
        // Add a middleware to block direct directory access
        this.app.use('/img', (req, res, next) => {
            if (req.path === '/' || req.path === '') {
                return res.status(403).send('Forbidden');
            }
            next();
        });
        
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));

        const sessionConfig = {
            store: new SQLiteStore(),
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

        // Handle API URL configuration differently for dev vs prod
        this.app.use((req, res, next) => {
            // In production with Nginx, use relative paths
            if (config.isProd()) {
                res.locals.apiBaseUrl = ''; // Empty for relative URLs
            } else {
                // In development, use the configured API_ENDPOINT and API_PORT
                res.locals.apiBaseUrl = apiUrl;
            }
            next();
        });
    }

    setupAuth() {
        passport.use(new Strategy({
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_CALLBACK_URL,
            scope: ['identify', 'guilds'],
            state: true
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                await DatabaseManager.getInstance();
                profile.accessToken = accessToken;
                return done(null, profile);
            } catch (error) {
                logger.error('Auth error:', error.message);
                return done(error, null);
            }
        }));

        passport.serializeUser((user, done) => {
            done(null, user);
        });

        passport.deserializeUser((user, done) => {
            done(null, user);
        });
    }

    async fetchGuildDetails(guildId) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'discord.com',
                path: `/api/v9/guilds/${guildId}`,
                method: 'GET',
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_TOKEN}`
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const parsedData = JSON.parse(data);
                            resolve(parsedData);
                        } catch (e) {
                            logger.error('Error parsing guild details:', e.message);
                            reject(new Error('Error parsing guild details'));
                        }
                    } else {
                        logger.error(`Failed to fetch guild details: ${res.statusCode} - ${data}`);
                        reject(new Error('Failed to fetch guild details'));
                    }
                });
            });

            req.on('error', (e) => {
                logger.error('Request error:', e.message);
                reject(e);
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    // Middleware to check if user is authenticated
    isAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/');
    }

    setupRoutes() {
        // Auth routes with explicit scope
        this.app.get('/auth/discord',
            passport.authenticate('discord', {
                scope: ['identify', 'guilds'],
                prompt: 'consent'
            })
        );

        this.app.get('/auth/callback',
            passport.authenticate('discord', {
                failureRedirect: '/',
                successRedirect: '/dashboard'
            })
        );

        // Logout route
        this.app.get('/logout', (req, res) => {
            req.logout((err) => {
                if (err) {
                    logger.error('Error during logout:', err);
                }
                res.redirect('/');
            });
        });

        // Login route
        this.app.get('/', (req, res) => {
            res.render('login');
        });

        // Dashboard routes
        this.app.get('/dashboard', this.isAuthenticated, async (req, res) => {
            try {
                // Using full URL for API calls from the server-side
                const api_port = process.env.API_PORT || 8080;
                const api_endpoint = process.env.API_ENDPOINT || 'http://localhost';
                const apiUrl = `${api_endpoint}:${api_port}`;
                
                const response = await fetch(`${apiUrl}/api/guilds`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.API_KEY}`
                    }
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch guilds: ${response.status}`);
                }
                
                const guilds = await response.json();
                const guildDetails = await Promise.all(guilds.map(async (guild) => {
                    if (this.userHasGuildAccess(guild, req.user)) {
                        try {
                            return await this.fetchGuildDetails(guild.id);
                        } catch (error) {
                            logger.error(`Error fetching details for guild ${guild.id}:`, error.message);
                            return null;
                        }
                    }
                    return null;
                }));
                
                res.render('dashboard', {
                    user: req.user,
                    guilds: guildDetails.filter(g => g !== null)
                });
            } catch (error) {
                logger.error('Error fetching guilds:', error.message);
                res.status(500).render('error', { 
                    message: 'Failed to load dashboard', 
                    error: { status: 500, stack: config.isDev() ? error.stack : '' } 
                });
            }
        });

        this.app.get('/privacy-policy', (req, res) => {
            res.render('pages/privacy_policy');
        });

        this.app.get('/tos', (req, res) => {
            res.render('pages/terms_of_service');
        });

        // Error handler for 404 - page not found
        this.app.use((req, res, next) => {
            res.status(404).render('error', { 
                message: 'Page not found', 
                error: { status: 404, stack: '' } 
            });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            const status = err.status || 500;
            logger.error('Server error:', err);
            res.status(status).render('error', { 
                message: err.message, 
                error: { status, stack: config.isDev() ? err.stack : '' } 
            });
        });
    }

    userHasGuildAccess(guild, user) {
        if (!user || !user.guilds) {
            return false;
        }
        const userGuild = user.guilds.find(g => g.id === guild.id);
        return userGuild && (userGuild.permissions & 0x8) === 0x8; // Check for ADMINISTRATOR permission
    }

    start() {
        const port = process.env.WEB_PORT || 4000;
        this.app.listen(port, () => {
            logger.info(`Web dashboard listening on port ${port}`);
            logger.info(`Open the dashboard at http://localhost:${port}`);
        });
    }
}

module.exports = WebServer;