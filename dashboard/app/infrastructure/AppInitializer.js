const ServiceFactory = require('../core/application/factories/ServiceFactory');
const ControllerFactory = require('../core/application/factories/ControllerFactory');
const Router = require('../adapters/in/web/Router');
const AuthConfig = require('../config/AuthConfig');
const SecurityConfig = require('../config/SecurityConfig');
const ErrorMiddleware = require('../adapters/in/web/ErrorMiddleware');
const express = require('express');
const path = require('path');
const logger = require('@shared/logger');
const config = require('@shared/config');

/**
 * Application initializer to set up all components
 */
class AppInitializer {
    /**
     * @param {Express.Application} app - Express application
     */
    constructor(app) {
        this.app = app;
    }

    /**
     * Initialize the application
     */
    initialize() {
        this.setupMiddleware();
        this.configureViewsAndStatic();
        this.setupDependencies();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Set up middleware
     */
    setupMiddleware() {
        // Setup security config
        const securityConfig = new SecurityConfig(this.app);
        securityConfig.init();

        // Setup auth config
        const authConfig = new AuthConfig(this.app);
        authConfig.init();

        // Body parsing middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
    }

    /**
     * Configure views and static files
     */
    configureViewsAndStatic() {
        // Configure view engine and static files
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, '../views'));
        this.app.use(express.static(path.join(__dirname, '../public')));
        
        // Add environment variables to all views
        this.app.use((req, res, next) => {
            res.locals.isDev = config.isDev();
            res.locals.isProd = config.isProd();
            next();
        });
        
        // Serve images from the img directory
        this.app.use('/img', express.static(path.join(__dirname, '../img'), {
            index: false,  // Disable directory index generation
            setHeaders: (res) => {
                res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            }
        }));
        
        // Block direct directory access
        this.app.use('/img', (req, res, next) => {
            if (req.path === '/' || req.path === '') {
                return res.status(403).send('Forbidden');
            }
            next();
        });
        
        // Serve logo as favicon
        this.app.use('/favicon.ico', (req, res) => {
            res.sendFile(path.join(__dirname, '../img/game-news-forge-logo-favicon.png'));
        });
    }

    /**
     * Set up dependencies
     */
    setupDependencies() {
        // Create all service instances
        this.services = ServiceFactory.createServices();
        
        // Create all controller instances
        this.controllers = ControllerFactory.createControllers(this.services);
    }

    /**
     * Set up routes
     */
    setupRoutes() {
        // Create and configure the router with services for authorization
        const router = new Router(
            this.controllers.authController,
            this.controllers.guildController,
            this.controllers.gameController,
            this.services.userService,
            this.services.guildService
        );
        
        // Use the configured router for all routes
        this.app.use('/', router.getRouter());
    }

    /**
     * Set up error handling
     */
    setupErrorHandling() {
        // Add error handling middleware as the last middleware
        this.app.use(ErrorMiddleware.createErrorHandler());
    }
}

module.exports = AppInitializer;