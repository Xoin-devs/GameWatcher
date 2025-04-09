const app = require('./app');
const logger = require('@shared/logger');
const config = require('./config');
const SessionCleanup = require('./utils/sessionCleanup');

/**
 * Handles uncaught exceptions to prevent app crash
 */
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Allow time for logs to be written before exiting
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

/**
 * Handles unhandled promise rejections to prevent app crash
 */
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

/**
 * Configure server port with fallback to default from centralized config
 */
const PORT = config.port;

/**
 * Start the server and handle startup errors
 */
const server = app.listen(PORT, () => {
    logger.info(`API server running on port ${PORT} in ${config.nodeEnv} mode`);
    // Initialize the session cleanup task
    SessionCleanup.init();
});

/**
 * Handle server errors
 */
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Please use a different port.`);
    } else {
        logger.error('Server error:', error);
    }
    process.exit(1);
});

/**
 * Graceful shutdown handler
 */
const shutdown = () => {
    logger.info('Shutting down API server...');
    
    // Stop the session cleanup task
    SessionCleanup.stop();
    logger.info('Session cleanup stopped');
    
    server.close(() => {
        logger.info('API server closed');
        process.exit(0);
    });

    // Force close if graceful shutdown takes too long
    setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);