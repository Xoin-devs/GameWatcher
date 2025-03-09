require('./config');
const logger = require('./logger');
const WebServer = require('./webServer');

async function startApp() {
    try {
        logger.info('Starting the application...');
        
        // Initialize and start web server
        const webServer = new WebServer();
        webServer.start();
        
        logger.info('Application started successfully');
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

startApp();