const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SQLiteStore = require('connect-sqlite3')(session);
const { Strategy } = require('passport-discord');
const path = require('path');
const DatabaseManager = require('./database');

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
                await db.saveSession(profile.id, profile.id, accessToken, Date.now() + 604800000);
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

    setupRoutes() {
        // Auth routes with explicit scope
        this.app.get('/auth/discord', 
            passport.authenticate('discord', { 
                scope: ['identify', 'guilds'],
                prompt: 'consent'
            })
        );

        this.app.get('/auth/discord/callback', 
            passport.authenticate('discord', { 
                failureRedirect: '/',
                successRedirect: '/dashboard'
            })
        );

        // Dashboard routes
        this.app.get('/dashboard', this.ensureAuthenticated, async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const guilds = await db.getGuilds();
            res.render('dashboard', { 
                user: req.user,
                guilds: guilds.filter(g => this.userHasGuildAccess(g, req.user))
            });
        });

        // API routes
        this.app.get('/api/games/:guildId', this.ensureAuthenticated, async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const games = await db.getGames(req.params.guildId);
            res.json(games);
        });

        // Game management API endpoints
        this.setupGameManagementRoutes();
    }

    setupGameManagementRoutes() {
        this.app.post('/api/games/:guildId', this.ensureAuthenticated, async (req, res) => {
            const db = await DatabaseManager.getInstance();
            const { name, sources, releaseDate } = req.body;
            
            try {
                await db.addGame(req.params.guildId, name, sources, releaseDate);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.delete('/api/games/:guildId/:gameName', this.ensureAuthenticated, async (req, res) => {
            const db = await DatabaseManager.getInstance();
            
            try {
                await db.removeGame(req.params.guildId, req.params.gameName);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }

    ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) return next();
        res.redirect('/auth/discord');
    }

    userHasGuildAccess(guild, user) {
        const userGuild = user.guilds.find(g => g.id === guild.id);
        return userGuild && (userGuild.permissions & 0x8) === 0x8; // Check for ADMINISTRATOR permission
    }

    start() {
        const port = process.env.WEB_PORT || 3000;
        this.app.listen(port, () => {
            console.log(`Web dashboard listening on port ${port}`);
        });
    }
}

module.exports = WebServer;