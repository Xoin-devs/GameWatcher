const express = require('express');
const gameController = require('@api/controllers/gameController');

const router = express.Router();

// Move specific routes before parameterized routes
router.get('/guilds', gameController.getGuilds);
router.get('/', gameController.getAllGames);

// Parameterized routes after specific routes
router.get('/:name', gameController.getGame);
router.put('/:name', gameController.updateGame);
router.delete('/:name', gameController.deleteGame);
router.post('/:name/link', gameController.linkGameToGuild);
router.post('/:name/unlink', gameController.unlinkGameFromGuild);
router.put('/:name/source', gameController.updateSourceLastUpdate);

// Add post route to the bottom
router.post('/', gameController.addGame);

module.exports = router;