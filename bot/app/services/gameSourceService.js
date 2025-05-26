// Game source processing service
const { apiCallWithTimeout, extractSteamAppId, extractTwitterHandle, isValidTwitterHandle } = require('@bot/utils/apiUtils');
const Utils = require('@bot/utils');
const logger = require('@shared/logger');

/**
 * Process Steam game source
 * @param {string} steamUrl - Steam store URL
 * @returns {Promise<Object>} - Game details from Steam
 * @throws {Error} - If Steam URL is invalid or API fails
 */
async function processSteamSource(steamUrl) {
    if (!steamUrl) return { steamSource: null, gameName: null, releaseDate: null };
    
    if (!steamUrl.includes('store.steampowered.com/app/')) {
        throw new Error('Invalid Steam URL format. Please provide a valid Steam store URL.');
    }
    
    const steamAppId = extractSteamAppId(steamUrl);
    if (!steamAppId) {
        throw new Error('Could not extract Steam App ID from the URL. Please check the URL format.');
    }
    
    logger.debug(`Extracted Steam AppID: ${steamAppId} from URL: ${steamUrl}`);
    
    try {
        const steamData = await apiCallWithTimeout(
            () => Utils.getSteamGameData(steamAppId)
        );
        
        if (!steamData) {
            throw new Error('Failed to fetch game data from Steam. The game might not exist or the Steam API may be experiencing issues.');
        }
        
        return {
            steamSource: steamAppId,
            gameName: steamData.name,
            releaseDate: steamData.formattedReleaseDate
        };
    } catch (error) {
        logger.error(`Error fetching Steam data for AppID ${steamAppId}:`, error);
        throw new Error(`Error fetching game data from Steam: ${error.message || 'Unknown error'}`);
    }
}

/**
 * Process Twitter game source
 * @param {string} twitterUrl - Twitter/X profile URL
 * @returns {Promise<Object>} - Game details from Twitter
 * @throws {Error} - If Twitter URL is invalid
 */
async function processTwitterSource(twitterUrl) {
    if (!twitterUrl) return { twitterSource: null, gameName: null };
    
    if (!Utils.isValidUrl(twitterUrl, ['twitter.com', 'x.com'])) {
        throw new Error('Invalid Twitter URL format. Please provide a valid Twitter/X profile URL.');
    }
    
    const twitterHandle = extractTwitterHandle(twitterUrl);
    if (!twitterHandle) {
        throw new Error('Could not extract Twitter handle from the URL. Please check the URL format.');
    }
    
    if (!isValidTwitterHandle(twitterHandle)) {
        throw new Error('The URL provided does not point to a Twitter/X user account.');
    }
    
    logger.debug(`Using Twitter handle as game name: "${twitterHandle}"`);
    
    return {
        twitterSource: twitterUrl,
        gameName: twitterHandle
    };
}

/**
 * Sanitize and normalize game name
 * @param {string} gameName - Raw game name
 * @returns {string} - Sanitized game name
 */
function sanitizeGameName(gameName) {
    if (!gameName) return null;
    
    // Sanitize and normalize
    let sanitized = gameName.trim().replace(/[^\w\s\-\.:()']/g, '').replace(/\s+/g, ' ');
    
    // Truncate if too long
    if (sanitized.length > 100) {
        sanitized = sanitized.substring(0, 97) + '...';
        logger.debug(`Game name was truncated to: ${sanitized}`);
    }
    
    return sanitized;
}

module.exports = {
    processSteamSource,
    processTwitterSource,
    sanitizeGameName
};
