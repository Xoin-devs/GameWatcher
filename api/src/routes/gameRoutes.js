const express = require('express');
const gameController = require('../controllers/gameController');

const router = express.Router();

// Games routes
router.get('/games', gameController.getAllGames);
router.get('/games/:guildId', gameController.getGamesWithSubscriptionStatus);
router.get('/game/:name', gameController.getGame);
router.post('/game', gameController.addGame);
router.put('/game/:name', gameController.updateGame);
router.delete('/game/:name', gameController.deleteGame);
router.post('/game/:name/guild', gameController.linkGameToGuild);
router.delete('/game/:name/guild', gameController.unlinkGameFromGuild);
router.put('/game/:name/source', gameController.updateSourceLastUpdate);

// Guild routes
router.get('/guilds', gameController.getGuilds);

// Direct relationships using IDs
router.post('/guilds/:guildId/games/:gameId', gameController.linkGameToGuildById);
router.delete('/guilds/:guildId/games/:gameId', gameController.unlinkGameFromGuildById);

module.exports = router;