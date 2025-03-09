const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const { Strategy } = require('passport-discord');
const path = require('path');
const https = require('https');
const DatabaseManager = require('./database');
const logger = require('./logger');

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
        this.app.use(express.json());
        
        // Re-enable session middleware
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
    }

    setupAuth() {
        passport.use(new Strategy({
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.DISCORD_CALLBACK_URL,
            scope: ['identify', 'guilds'],
            state: true // Enable state verification
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const db = await DatabaseManager.getInstance();
                // Removed db.saveSession(profile.id, profile.id, accessToken, Date.now() + 604800000);
                profile.accessToken = accessToken; // Store access token in profile
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
            const db = await DatabaseManager.getInstance();
            const guilds = await db.getGuilds();
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
        });

        // API routes
        this.app.get('/api/games/:guildId', async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const guildId = req.params.guildId;
            const allGames = await db.getGames();
            const guildGames = await db.getGuildGames(guildId);
            const guildGameIds = new Set(guildGames.map(g => g.id));
            const result = allGames.map(game => ({
                ...game,
                subscribed: guildGameIds.has(game.id)
            }));
            res.json(result);
        });

        // Game management API endpoints
        this.setupGameManagementRoutes();
    }

    setupGameManagementRoutes() {
        this.app.post('/api/games/:guildId', async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const { name, sources, releaseDate } = req.body;
            
            try {
                const gameId = await db.addGame(name, sources, releaseDate);
                await db.linkGameToGuild(req.params.guildId, gameId);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/games/:guildId/:gameId', async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const guildId = req.params.guildId;
            const gameId = req.params.gameId;
            try {
                await db.linkGameToGuild(guildId, gameId);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.delete('/api/games/:guildId/:gameId', async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const guildId = req.params.guildId;
            const gameId = req.params.gameId;
            try {
                await db.unlinkGameFromGuild(guildId, gameId);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.delete('/api/games/:guildId/:gameName', async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const guildId = req.params.guildId;
            const gameName = req.params.gameName;
            
            try {
                const guildGame = await db.getGuildGame(guildId, gameName);
                if (!guildGame) {
                    return res.status(404).json({ error: 'Game not found for this guild' });
                }
                await db.unlinkGameFromGuild(guildId, guildGame.id);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }

    // Removed ensureAuthenticated method

    userHasGuildAccess(guild, user) {
        if (!user || !user.guilds) {
            return false;
        }
        const userGuild = user.guilds.find(g => g.id === guild.id);
        return userGuild && (userGuild.permissions & 0x8) === 0x8; // Check for ADMINISTRATOR permission
    }

    start() {
        const port = process.env.WEB_PORT || 3000;
        this.app.listen(port, () => {
            logger.info(`Web dashboard listening on port ${port}`);
            logger.info(`Open the dashboard at http://localhost:${port}/dashboard`);
        });
    }
}

module.exports = WebServer;