// Game database service
const DatabaseManager = require('@shared/database');
const logger = require('@shared/logger');

/**
 * Check if a game exists and if the guild is subscribed to it
 * @param {string} guildId - Discord guild ID
 * @param {string} gameName - Game name
 * @returns {Promise<Object>} - Object with exists, subscribed, and gameId properties
 */
async function checkGameAndSubscription(guildId, gameName) {
    const db = await DatabaseManager.getInstance();
    const existingGame = await db.getGame(gameName);
    
    if (!existingGame) {
        return { exists: false, subscribed: false, gameId: null };
    }
    
    logger.info(`Game "${gameName}" already exists in database with ID: ${existingGame.id}`);
    const isSubscribed = await db.isGameSubscribed(guildId, existingGame.id);
    
    return {
        exists: true,
        subscribed: isSubscribed,
        gameId: existingGame.id,
        game: existingGame
    };
}

/**
 * Subscribe a guild to an existing game
 * @param {string} guildId - Discord guild ID
 * @param {number} gameId - Game ID in the database
 * @returns {Promise<boolean>} - Success status
 */
async function subscribeGuildToGame(guildId, gameId) {
    const db = await DatabaseManager.getInstance();
    await db.linkGameToGuild(guildId, gameId);
    logger.info(`Guild ${guildId} subscribed to existing game ID: ${gameId}`);
    return true;
}

/**
 * Create a new game and subscribe guild to it
 * @param {string} gameName - Game name
 * @param {Object} gameObject - Game object with sources and release date
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object>} - Game ID and complete game object
 */
async function createGameWithSubscription(gameName, gameObject, guildId) {
    const db = await DatabaseManager.getInstance();
    
    // Add the game to database
    const gameId = await db.addGame(
        gameName,
        gameObject.sources,
        gameObject.releaseDate
    );
    
    if (!gameId) {
        throw new Error('Failed to add game to database - no game ID returned');
    }
    
    // Link the game to the guild
    await db.linkGameToGuild(guildId, gameId);
    
    // Return the complete game object for the ReleaseManager
    const newGame = await db.getGame(gameName);
    if (!newGame) {
        throw new Error('Failed to retrieve newly created game');
    }
    
    logger.info(`Game "${gameName}" (ID: ${gameId}) added successfully and linked to guild ${guildId}`);
    return { gameId, game: newGame };
}

/**
 * Check if a guild is subscribed to a game
 * @param {string} guildId - Discord guild ID
 * @param {number} gameId - Game ID in the database
 * @returns {Promise<boolean>} - Whether the guild is subscribed to the game
 */
async function isGuildSubscribed(guildId, gameId) {
    const db = await DatabaseManager.getInstance();
    return await db.isGameSubscribed(guildId, gameId);
}

/**
 * Get database instance
 * @returns {Promise<Object>} - DatabaseManager instance
 */
async function getDatabaseInstance() {
    return await DatabaseManager.getInstance();
}

module.exports = {
    checkGameAndSubscription,
    subscribeGuildToGame,
    createGameWithSubscription,
    isGuildSubscribed,
    getDatabaseInstance
};
