const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const https = require('https');
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
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Serve images from the img directory with directory browsing disabled
        this.app.use('/img', express.static(path.join(__dirname, 'img'), {
            index: false,  // Disable directory index generation
            setHeaders: (res) => {
                // Set headers to prevent caching issues if needed
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

        this.app.use(session({
            store: new SQLiteStore(),
            secret: process.env.SESSION_SECRET || 'your-secret-key',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                maxAge: 604800000 // 7 days
            }
        }));

        this.app.use(passport.initialize());
        this.app.use(passport.session());

        // Handle API URL configuration differently for dev vs prod
        this.app.use((req, res, next) => {
            // In production with Nginx, use relative paths
            if (config.isProd()) {
                res.locals.apiBaseUrl = ''; // Empty for relative URLs
            } else {
                // In development, use the configured API_ENDPOINT and API_PORT
                const api_port = process.env.API_PORT || 8080;
                const api_endpoint = process.env.API_ENDPOINT || 'http://localhost';
                res.locals.apiBaseUrl = `${api_endpoint}:${api_port}`;
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
                const db = await DatabaseManager.getInstance();
                profile.accessToken = accessToken;
                return done(null, profile);
            } catch (error) {
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
                        resolve(JSON.parse(data));
                    } else {
                        console.error(`Failed to fetch guild details: ${res.statusCode} - ${data}`);
                        reject(new Error('Failed to fetch guild details'));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            req.end();
        });
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

        // Login route
        this.app.get('/', (req, res) => {
            res.render('login');
        });

        // Dashboard routes
        this.app.get('/dashboard', async (req, res) => {
            if (!req.user) {
                return res.redirect('/');
            }

            try {
                // Using full URL for API calls from the server-side
                const api_port = process.env.API_PORT || 8080;
                const api_endpoint = process.env.API_ENDPOINT || 'http://localhost';
                const apiUrl = `${api_endpoint}:${api_port}`;
                
                const response = await fetch(`${apiUrl}/api/guilds`);
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch guilds: ${response.status}`);
                }
                const guilds = await response.json();
                const guildDetails = await Promise.all(guilds.map(async (guild) => {
                    if (this.userHasGuildAccess(guild, req.user)) {
                        return await this.fetchGuildDetails(guild.id);
                    }
                    return null;
                }));
                res.render('dashboard', {
                    user: req.user,
                    guilds: guildDetails.filter(g => g !== null)
                });
            } catch (error) {
                logger.error('Error fetching guilds:', error.message);
                res.status(500).send('Internal Server Error');
            }
        });

        this.app.get('/privacy-policy', (req, res) => {
            res.render('pages/privacy_policy');
        });

        this.app.get('/tos', (req, res) => {
            res.render('pages/terms_of_service');
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
            logger.info(`Open the dashboard at http://localhost:${port}/dashboard`);
        });
    }
}

module.exports = WebServer;