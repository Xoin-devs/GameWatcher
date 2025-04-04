const express = require('express');
const passport = require('passport');

/**
 * Router class to handle all web routes in the application
 */
class Router {
    /**
     * @param {import('./AuthController')} authController 
     * @param {import('./GuildController')} guildController 
     * @param {import('./GameController')} gameController
     */
    constructor(authController, guildController, gameController) {
        this.router = express.Router();
        this.authController = authController;
        this.guildController = guildController;
        this.gameController = gameController;
        
        this.setupRoutes();
    }
    
    /**
     * Middleware to check if user is authenticated
     */
    isAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect('/login');
    }
    
    /**
     * Setup all application routes
     */
    setupRoutes() {
        // Auth routes
        this.router.get('/', (req, res) => res.redirect('/dashboard'));
        this.router.get('/login', (req, res, next) => this.authController.renderLogin(req, res, next));
        this.router.get('/logout', (req, res, next) => this.authController.handleLogout(req, res, next));
        
        this.router.get('/auth/discord', passport.authenticate('discord', { 
            scope: ['identify', 'guilds'] 
        }));
        
        this.router.get('/auth/callback', 
            passport.authenticate('discord', { 
                failureRedirect: '/login' 
            }),
            (req, res, next) => this.authController.handleAuthCallback(req, res, next)
        );
        
        // Dashboard route
        this.router.get('/dashboard', 
            this.isAuthenticated,
            (req, res, next) => this.guildController.renderDashboard(req, res, next)
        );
        
        // API Routes
        // Guild routes
        this.router.get('/api/guilds', 
            this.isAuthenticated,
            (req, res, next) => this.guildController.getAllGuilds(req, res, next)
        );
        
        this.router.get('/api/guilds/:guildId', 
            this.isAuthenticated,
            (req, res, next) => this.guildController.getGuildDetails(req, res, next)
        );
        
        // Game routes
        this.router.get('/api/guilds/:guildId/games', 
            this.isAuthenticated,
            (req, res, next) => this.gameController.getGuildGames(req, res, next)
        );
        
        this.router.get('/api/guilds/:guildId/stats', 
            this.isAuthenticated,
            (req, res, next) => this.gameController.getGuildGameStats(req, res, next)
        );
        
        this.router.post('/api/guilds/:guildId/games/:gameId/toggle', 
            this.isAuthenticated,
            (req, res, next) => this.gameController.toggleGameSubscription(req, res, next)
        );
        
        // Static pages
        this.router.get('/privacy-policy', (req, res) => {
            res.render('pages/privacy_policy');
        });

        this.router.get('/tos', (req, res) => {
            res.render('pages/terms_of_service');
        });
        
        // Error handler for 404 - page not found
        this.router.use((req, res, next) => {
            const err = new Error('Page not found');
            err.statusCode = 404;
            next(err);
        });
    }
    
    /**
     * Get the configured router
     * @returns {express.Router} The configured Express router
     */
    getRouter() {
        return this.router;
    }
}

module.exports = Router;