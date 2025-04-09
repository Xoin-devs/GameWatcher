require('module-alias/register');
require('@shared/config');
const cors = require('cors');
const express = require('express');
const expressSanitizer = require('express-sanitizer');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const gameRoutes = require('./routes/gameRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const logger = require('@shared/logger');
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const { responseMiddleware } = require('./utils/response');
const requestLogger = require('./utils/requestLogger');

const app = express();

// Configure Express to trust proxy headers (important when behind Nginx)
app.set('trust proxy', 1);

// Enhanced CORS configuration from centralized config
const corsOptions = {
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
};

// Apply CORS as the first middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json());

// Add sanitization middleware to prevent XSS attacks
app.use(expressSanitizer());

// Configure rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
        statusCode: 429
    }
});

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Add request tracking middleware
app.use(requestLogger);

// Add response standardization middleware
app.use(responseMiddleware);

// API Documentation - no rate limit for documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Game News Forge API Documentation'
}));

// Routes
app.use('/api', gameRoutes);
app.use('/api', sessionRoutes);

// 404 handler
app.use((req, res, next) => {
    res.sendError(`Route ${req.originalUrl} not found`, 404);
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    
    // Log the error with request ID for tracking
    logger.error(`[${req.requestId}] [${req.method}] ${req.path} - ${statusCode}: ${err.message}`);
    
    // Create standardized error response
    const errorDetails = config.isProd() ? null : { stack: err.stack };
    
    res.sendError(err.message || 'Internal Server Error', statusCode, errorDetails);
});

module.exports = app;