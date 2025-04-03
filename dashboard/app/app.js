require('module-alias/register');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'dev'}` });
const logger = require('@shared/logger');
const WebServer = require('./infrastructure/WebServer');

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Allow time for logs to be written before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function startApp() {
    try {
        logger.info(`Starting dashboard in ${process.env.NODE_ENV || 'dev'} mode...`);
        
        // Initialize and start web server
        const webServer = new WebServer();
        webServer.start();
        
        logger.info('Dashboard started successfully');
    } catch (error) {
        logger.error('Failed to start application:', error.message);
        process.exit(1);
    }
}

startApp();