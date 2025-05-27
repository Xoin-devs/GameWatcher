const express = require('express');
const passport = require('passport');
const GuildAuthMiddleware = require('./middleware/GuildAuthMiddleware');

/**
 * Router class to handle all web routes in the application
 */
class Router {
    /**
     * @param {import('./AuthController')} authController 
     * @param {import('./GuildController')} guildController 
     * @param {import('./GameController')} gameController
     * @param {import('../../core/domain/ports/in/UserPort')} userService
     * @param {import('../../core/domain/ports/in/GuildPort')} guildService
     */
    constructor(authController, guildController, gameController, userService, guildService) {
        this.router = express.Router();
        this.authController = authController;
        this.guildController = guildController;
        this.gameController = gameController;
        
        // Initialize the guild auth middleware
        this.guildAuthMiddleware = new GuildAuthMiddleware(userService, guildService);
        
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
        
        // Dashboard API Routes with /gnf/ prefix - only the ones actually used by the frontend
        // Game routes - these are the only ones used by the frontend client
        this.router.get('/gnf/guilds/:guildId/games', 
            this.isAuthenticated,
            this.guildAuthMiddleware.checkGuildPermission(),
            (req, res, next) => this.gameController.getGuildGames(req, res, next)
        );
        
        this.router.get('/gnf/guilds/:guildId/stats', 
            this.isAuthenticated,
            this.guildAuthMiddleware.checkGuildPermission(),
            (req, res, next) => this.gameController.getGuildGameStats(req, res, next)
        );
        
        this.router.post('/gnf/guilds/:guildId/games/:gameId/toggle', 
            this.isAuthenticated,
            this.guildAuthMiddleware.checkGuildPermission(),
            (req, res, next) => this.gameController.toggleGameSubscription(req, res, next)
        );
        
        // Static pages
        this.router.get('/privacy-policy', (req, res) => {
            res.render('pages/privacy_policy');
        });        this.router.get('/tos', (req, res) => {
            res.render('pages/terms_of_service');
        });
        
        // 404 handler for unmatched routes - this should only trigger for actual 404s
        this.router.use((req, res, next) => {
            // Only create 404 error if no response has been sent yet
            if (!res.headersSent) {
                const err = new Error('Page not found');
                err.statusCode = 404;
                next(err);
            }
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