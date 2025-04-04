const express = require('express');
const gameController = require('../controllers/gameController');

const router = express.Router();

// Guild routes
router.get('/guilds', gameController.getGuilds);
router.get('/guilds/:guildId', gameController.getGuildDetails);

// Game routes
router.get('/guilds/:guildId/games', gameController.getGamesWithSubscriptionStatus);
router.get('/guilds/:guildId/stats', gameController.getGuildGameStats);
router.post('/guilds/:guildId/games/:gameId/toggle', gameController.toggleGameSubscription);

module.exports = router;