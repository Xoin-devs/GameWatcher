// Utility functions for API calls
const logger = require('@shared/logger');

/**
 * Make an API call with timeout protection
 * @param {Function} apiFunction - Async function that makes the API call
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<any>} - API response or throws error
 */
async function apiCallWithTimeout(apiFunction, timeoutMs = 10000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timed out')), timeoutMs);
    });
    
    return Promise.race([
        apiFunction(),
        timeoutPromise
    ]);
}

/**
 * Extract Steam app ID from a Steam URL
 * @param {string} steamUrl - Steam URL
 * @returns {string|null} - Steam app ID or null if not found
 */
function extractSteamAppId(steamUrl) {
    if (!steamUrl) return null;
    
    const steamAppIdMatch = steamUrl.match(/\/app\/(\d+)(?:\/|$)/);
    return steamAppIdMatch ? steamAppIdMatch[1] : null;
}

/**
 * Extract Twitter handle from a Twitter URL
 * @param {string} twitterUrl - Twitter/X URL
 * @returns {string|null} - Twitter handle or null if not found
 */
function extractTwitterHandle(twitterUrl) {
    if (!twitterUrl) return null;
    
    const twitterHandleMatch = twitterUrl.match(/(?:twitter|x)\.com\/(?:#!\/)?(?:\w+\/)*([^/?#]+)/i);
    return twitterHandleMatch ? twitterHandleMatch[1] : null;
}

/**
 * Check if a Twitter handle is valid (not a reserved path)
 * @param {string} handle - Twitter handle
 * @returns {boolean} - Whether handle is valid
 */
function isValidTwitterHandle(handle) {
    if (!handle) return false;
    
    const invalidHandles = ['home', 'explore', 'notifications', 'messages', 'i', 'settings'];
    return !invalidHandles.includes(handle.toLowerCase());
}

module.exports = {
    apiCallWithTimeout,
    extractSteamAppId,
    extractTwitterHandle,
    isValidTwitterHandle
};
