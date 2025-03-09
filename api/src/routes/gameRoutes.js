const express = require('express');
const gameController = require('@api/controllers/gameController');

const router = express.Router();

router.get('/', gameController.getAllGames);
router.get('/:name', gameController.getGame);
router.post('/', gameController.addGame);
router.put('/:name', gameController.updateGame);
router.delete('/:name', gameController.deleteGame);
router.post('/:name/link', gameController.linkGameToGuild);
router.post('/:name/unlink', gameController.unlinkGameFromGuild);
router.put('/:name/source', gameController.updateSourceLastUpdate);
router.get('/guilds', gameController.getGuilds);

module.exports = router;