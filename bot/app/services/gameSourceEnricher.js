// Game source enricher service
const logger = require('@shared/logger');
const { apiCallWithTimeout, extractSteamAppId } = require('@bot/utils/apiUtils');
const Utils = require('@bot/utils');
const DatabaseManager = require('@shared/database');
const SourceType = require('@bot/constants/sourceType');

/**
 * Check if a game with given sources exists in the database
 * @param {string} steamUrl - Steam store URL
 * @param {string} twitterUrl - Twitter URL
 * @returns {Promise<Object|null>} - Existing game or null
 */
async function findExistingGameBySource(steamUrl, twitterUrl) {
    const db = await DatabaseManager.getInstance();
    let existingGame = null;
    
    // Try to find by Steam AppID
    if (steamUrl) {
        const steamAppId = extractSteamAppId(steamUrl);
        if (steamAppId) {
            logger.debug(`Looking for existing game with Steam AppID: ${steamAppId}`);
            existingGame = await db.getGameBySteamAppId(steamAppId);
            
            if (existingGame) {
                logger.info(`Found existing game "${existingGame.name}" using Steam AppID ${steamAppId}`);
                return existingGame;
            }
        }
    }
    
    // Try to find by Twitter URL
    if (twitterUrl && !existingGame) {
        logger.debug(`Looking for existing game with Twitter URL: ${twitterUrl}`);
        existingGame = await db.getGameByTwitterUrl(twitterUrl);
        
        if (existingGame) {
            logger.info(`Found existing game "${existingGame.name}" using Twitter URL ${twitterUrl}`);
            return existingGame;
        }
    }
    
    return null;
}

/**
 * Determine if we need to fetch additional data from Steam
 * @param {Object|null} existingGame - Existing game from database
 * @param {string} steamUrl - Steam URL
 * @returns {boolean} - Whether to fetch Steam data
 */
function shouldFetchSteamData(existingGame, steamUrl) {
    // If no existing game and we have a Steam URL, fetch data
    if (!existingGame && steamUrl) {
        return true;
    }
    
    // If existing game doesn't have a Steam source but we have a Steam URL, fetch data
    if (existingGame && steamUrl) {
        const hasSteamSource = existingGame.sources && existingGame.sources.some(
            source => source[SourceType.STEAM_INTERNAL] || source[SourceType.STEAM_EXTERNAL]
        );
        
        return !hasSteamSource;
    }
    
    return false;
}

/**
 * Enriches game details by combining existing data with new sources
 * @param {Object|null} existingGame - Existing game or null if not found
 * @param {string} steamUrl - Steam URL
 * @param {string} twitterUrl - Twitter URL
 * @param {Object} interaction - Discord interaction for status updates
 * @returns {Promise<Object>} - Enriched game details
 */
async function enrichGameDetails(existingGame, steamUrl, twitterUrl, interaction) {
    let gameName = existingGame ? existingGame.name : null;
    let gameDetails = {
        twitterSource: twitterUrl,
        steamSource: null,
        releaseDate: existingGame ? existingGame.releaseDate : null
    };
    
    // Check if we need to fetch Steam data
    if (shouldFetchSteamData(existingGame, steamUrl)) {
        await interaction.editReply({ content: '🔍 Fetching game data from Steam...' });
        
        try {
            const steamAppId = extractSteamAppId(steamUrl);
            if (!steamAppId) {
                throw new Error('Could not extract Steam App ID from the URL. Please check the URL format.');
            }
            
            gameDetails.steamSource = steamAppId;
            
            // Only fetch from API if we need more data
            const steamData = await apiCallWithTimeout(
                () => Utils.getSteamGameData(steamAppId)
            );
            
            if (!steamData) {
                throw new Error('Failed to fetch game data from Steam. The game might not exist or the Steam API may be experiencing issues.');
            }
            
            // If we don't have a name yet, use the Steam name
            if (!gameName) {
                gameName = steamData.name;
            }
            
            // If we don't have a release date yet, use the Steam release date
            if (!gameDetails.releaseDate) {
                gameDetails.releaseDate = steamData.formattedReleaseDate;
            }
            
            logger.debug(`Steam game data retrieved for "${gameName}":`, {
                appId: steamAppId,
                name: gameName,
                releaseDate: gameDetails.releaseDate
            });
        } catch (error) {
            logger.error(`Error fetching Steam data:`, error);
            
            // Only throw if we don't have existing data
            if (!existingGame) {
                throw new Error(`Error fetching game data from Steam: ${error.message || 'Unknown error'}`);
            }
        }
    } else if (existingGame && existingGame.sources) {
        // Use existing Steam source if available
        const steamSource = existingGame.sources.find(source => source[SourceType.STEAM_INTERNAL]);
        if (steamSource) {
            gameDetails.steamSource = steamSource[SourceType.STEAM_INTERNAL];
        }
    }
    
    // If we still don't have a name but have a Twitter URL, use Twitter handle
    if (!gameName && twitterUrl) {
        await interaction.editReply({ content: '🔍 Processing Twitter information...' });
        
        try {
            const twitterHandle = extractTwitterHandle(twitterUrl);
            if (twitterHandle) {
                gameName = twitterHandle;
                logger.debug(`Using Twitter handle as game name: "${gameName}"`);
            }
        } catch (error) {
            logger.error(`Error processing Twitter data:`, error);
            throw new Error(`Error processing Twitter data: ${error.message || 'Unknown error'}`);
        }
    }
    
    // If we have an existing game but no name, use existing name
    if (!gameName && existingGame) {
        gameName = existingGame.name;
    }
    
    return { gameName, gameDetails, existingGame };
}

module.exports = {
    findExistingGameBySource,
    enrichGameDetails,
    shouldFetchSteamData
};
