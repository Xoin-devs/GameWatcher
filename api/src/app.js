require('module-alias/register');
require('@shared/config');
const cors = require('cors');
const express = require('express');
const gameRoutes = require('./routes/gameRoutes');
const logger = require('@shared/logger');

const app = express();

// Enhanced CORS configuration
const corsOptions = {
    origin: ['https://oslo.ovh', 'http://localhost:4000', 'http://localhost:81'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api', gameRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
});

module.exports = app;