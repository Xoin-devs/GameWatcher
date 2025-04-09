/**
 * Session management routes
 */
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const validationHandler = require('../middleware/validationHandler');

/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   get:
 *     summary: Get a session by ID
 *     description: Retrieves a session by its ID if it exists and is not expired
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session data retrieved successfully
 *       404:
 *         description: Session not found or expired
 */
router.get(
    '/sessions/:sessionId',
    [
        param('sessionId').notEmpty().withMessage('Session ID is required')
    ],
    validationHandler,
    sessionController.getSession
);

/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   post:
 *     summary: Create or update a session
 *     description: Creates a new session or updates an existing one
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: string
 *                 description: Serialized session data
 *               maxAge:
 *                 type: number
 *                 description: Session max age in milliseconds
 *     responses:
 *       200:
 *         description: Session stored successfully
 *       400:
 *         description: Invalid request parameters
 */
router.post(
    '/sessions/:sessionId',
    [
        param('sessionId').notEmpty().withMessage('Session ID is required'),
        body('data').notEmpty().withMessage('Session data is required'),
        body('maxAge').isNumeric().withMessage('maxAge must be a number')
    ],
    validationHandler,
    sessionController.setSession
);

/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a session
 *     description: Deletes a session by its ID
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID
 *     responses:
 *       200:
 *         description: Session destroyed successfully
 *       500:
 *         description: Failed to destroy session
 */
router.delete(
    '/sessions/:sessionId',
    [
        param('sessionId').notEmpty().withMessage('Session ID is required')
    ],
    validationHandler,
    sessionController.destroySession
);

/**
 * @swagger
 * /api/sessions/clear-expired:
 *   post:
 *     summary: Clear expired sessions
 *     description: Removes all expired sessions from storage
 *     responses:
 *       200:
 *         description: Expired sessions cleared successfully
 */
router.post(
    '/sessions/clear-expired',
    sessionController.clearExpiredSessions
);

module.exports = router;
