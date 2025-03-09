require('module-alias/register');
require('@shared/config');
const cors = require('cors');
const express = require('express');
const gameRoutes = require('./routes/gameRoutes');
const logger = require('@shared/logger');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/games', gameRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.message);
    res.status(500).json({ error: err.message });
});

module.exports = app;