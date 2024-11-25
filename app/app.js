const client = require('./client');
const { token } = require('./config');
const { initCommandsLocally } = require('./commandHandler');
const logger = require('./logger');
const WebServer = require('./webServer');

async function startApp() {
    try {
        logger.info('Starting the application...');
        
        // Initialize bot commands
        await initCommandsLocally();
        
        // Initialize and start web server
        const webServer = new WebServer();
        webServer.start();
        
        // Login to Discord
        await client.login(token);
        
        logger.info('Application started successfully');
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

startApp();