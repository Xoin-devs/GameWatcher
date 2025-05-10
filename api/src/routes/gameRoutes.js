const express = require('express');
const { param, query, validationResult } = require('express-validator');
const gameController = require('../controllers/gameController');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * @swagger
 * /guilds:
 *   get:
 *     summary: Retrieve all guilds
 *     description: Get a list of all Discord guilds using the bot
 *     tags: [Guilds]
 *     responses:
 *       200:
 *         description: A list of guilds
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Guild'
 */
router.get('/guilds', gameController.getGuilds);

/**
 * @swagger
 * /games:
 *   get:
 *     summary: Retrieve all games
 *     description: Get a list of all Discord games tracked by the bot
 *     tags: [Games]
 *     responses:
 *       200:
 *         description: A list of games
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Game'
 */
router.get('/games', gameController.getAllGames);

/**
 * @swagger
 * /guilds/{guildId}:
 *   get:
 *     summary: Get guild details
 *     description: Retrieve details for a specific Discord guild
 *     tags: [Guilds]
 *     parameters:
 *       - in: path
 *         name: guildId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord guild ID
 *     responses:
 *       200:
 *         description: Guild details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Guild'
 *       404:
 *         description: Guild not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/guilds/:guildId', 
    [param('guildId').notEmpty().withMessage('Guild ID is required')],
    validate,
    gameController.getGuildDetails
);

/**
 * @swagger
 * /guilds/{guildId}/games:
 *   get:
 *     summary: Get games with subscription status
 *     description: Retrieve a paginated list of games with the subscription status for a specific guild
 *     tags: [Games]
 *     parameters:
 *       - in: path
 *         name: guildId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord guild ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter games
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [subscribed, unsubscribed, '']
 *         description: Filter games by subscription status
 *     responses:
 *       200:
 *         description: Paginated list of games with subscription status
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         games:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Game'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             totalGames:
 *                               type: integer
 *                             totalPages:
 *                               type: integer
 *                             currentPage:
 *                               type: integer
 *                             limit:
 *                               type: integer
 */
router.get('/guilds/:guildId/games', 
    [
        param('guildId').notEmpty().withMessage('Guild ID is required'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('search').optional().isString(),
        query('filter').optional().isString()
    ],
    validate,
    gameController.getGamesWithSubscriptionStatus
);

/**
 * @swagger
 * /guilds/{guildId}/stats:
 *   get:
 *     summary: Get guild game statistics
 *     description: Retrieve statistics about games and subscriptions for a guild
 *     tags: [Guilds]
 *     parameters:
 *       - in: path
 *         name: guildId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord guild ID
 *     responses:
 *       200:
 *         description: Guild game statistics
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalGames:
 *                           type: integer
 *                           description: Total number of games available
 *                         subscribedGames:
 *                           type: integer
 *                           description: Number of games the guild is subscribed to
 */
router.get('/guilds/:guildId/stats', 
    [param('guildId').notEmpty().withMessage('Guild ID is required')],
    validate,
    gameController.getGuildGameStats
);

/**
 * @swagger
 * /guilds/{guildId}/games/{gameId}/toggle:
 *   post:
 *     summary: Toggle game subscription
 *     description: Subscribe to or unsubscribe from a game for a specific guild
 *     tags: [Games]
 *     parameters:
 *       - in: path
 *         name: guildId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord guild ID
 *       - in: path
 *         name: gameId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Game ID
 *     responses:
 *       200:
 *         description: Subscription toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         subscribed:
 *                           type: boolean
 *                           description: Whether the guild is now subscribed to the game
 */
router.post('/guilds/:guildId/games/:gameId/toggle', 
    [
        param('guildId').notEmpty().withMessage('Guild ID is required'),
        param('gameId').notEmpty().isInt().withMessage('Game ID must be an integer')
    ],
    validate,
    gameController.toggleGameSubscription
);

module.exports = router;