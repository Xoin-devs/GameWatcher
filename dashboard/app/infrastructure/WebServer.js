const express = require('express');
const logger = require('@shared/logger');
const AppInitializer = require('./AppInitializer');

/**
 * Main Web Server class that configures and runs the application
 */
class WebServer {
    constructor() {
        this.app = express();
        this.initialize();
    }

    /**
     * Initialize the application
     */
    initialize() {
        const initializer = new AppInitializer(this.app);
        initializer.initialize();
    }

    /**
     * Start the web server
     */
    start() {
        const port = process.env.WEB_PORT || 4000;
        this.app.listen(port, () => {
            logger.info(`Web dashboard listening on port ${port}`);
            logger.info(`Open the dashboard at http://localhost:${port}`);
        });
    }
}

module.exports = WebServer;