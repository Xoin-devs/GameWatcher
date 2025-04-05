/**
 * Middleware for logging and tracking requests
 */
const logger = require('@shared/logger');
const crypto = require('crypto');

/**
 * Generate a unique request ID
 * @returns {string} A unique request ID
 */
const generateRequestId = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Request logger middleware
 * Logs information about incoming requests and their completion
 */
const requestLogger = (req, res, next) => {
  // Generate a unique request ID for tracking
  req.requestId = generateRequestId();
  const startTime = Date.now();
  
  // Create a log prefix with the request ID
  const logPrefix = `[${req.requestId}]`;
  
  // Log the incoming request
  logger.info(`${logPrefix} ${req.method} ${req.originalUrl} - Request received`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    params: req.params
  });

  // Log the response when it's sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusMessage = res.statusMessage || '';
    
    if (statusCode >= 400) {
      logger.warn(`${logPrefix} ${req.method} ${req.originalUrl} - ${statusCode} ${statusMessage} - ${duration}ms`);
    } else {
      logger.info(`${logPrefix} ${req.method} ${req.originalUrl} - ${statusCode} ${statusMessage} - ${duration}ms`);
    }
  });

  next();
};

module.exports = requestLogger;