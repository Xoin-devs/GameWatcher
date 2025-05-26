const CommandsOption = require('@bot/constants/commandsOption');
const SourceType = require('@bot/constants/sourceType');
const axios = require('axios');

function normalizeName(name) {
    return name.toLowerCase().replace(/\s+/g, '');
}

function parseDate(dateInput) {
    if (!dateInput) return null;
    
    let isoDate;
    
    // Check if dateInput is a Date object
    if (dateInput instanceof Date) {
        // Format the Date object to YYYY-MM-DD
        isoDate = `${dateInput.getFullYear()}-${(dateInput.getMonth() + 1).toString().padStart(2, '0')}-${dateInput.getDate().toString().padStart(2, '0')}`;
    } 
    // Check if dateInput is already in ISO format (YYYY-MM-DD)
    else if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        isoDate = dateInput;
    }
    // Process as DD/MM/YYYY string format
    else if (typeof dateInput === 'string' && dateInput.includes('/')) {
        const [day, month, year] = dateInput.split('/');
        isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // Try to parse as a general string date format
    else {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
            isoDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        } else {
            throw new Error(`Invalid date format: ${dateInput}`);
        }
    }
    
    // Validate the date is correct
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateInput}`);
    }
    
    return isoDate;
}

function formatDate(isoDate) {
    if (!isoDate) return null;
    
    // Ensure isoDate is a string
    if (typeof isoDate !== 'string') {
        // If it's a Date object, convert to ISO string and extract the date part
        if (isoDate instanceof Date) {
            isoDate = isoDate.toISOString().split('T')[0];
        } else {
            // If it's something else we can't handle, return null
            return null;
        }
    }
    
    // Check if string is in the expected ISO format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return null;
    }
    
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
}

function isGameRegistered(config, gameName) {
    return config.games.some(game => normalizeName(game.name) === normalizeName(gameName));
}

function getGameByName(config, gameName) {
    return config.games.find(game => normalizeName(game.name) === normalizeName(gameName));
}

function getGameSuggestionsByName(config, gameName) {
    return config.games.filter(game => normalizeName(game.name).includes(normalizeName(gameName)));
}

function getGameInfos(game) {
    const gameInfo = [];
    if (game.name) {
        gameInfo.push(`name: ${game.name}`);
    }
    if (game.sources) {
        game.sources.forEach(source => {
            if (source[SourceType.TWITTER]) {
                gameInfo.push(`twitter: ${source[SourceType.TWITTER]}`);
            }
            if (source[SourceType.STEAM_INTERNAL]) {
                gameInfo.push(`steam: ${source[SourceType.STEAM_INTERNAL]}`);
            }
        });
    }
    if (game.releaseDate) {
        gameInfo.push(`release_date: ${formatHumanReadableDate(game.releaseDate)}`);
    }
    return gameInfo.join(' ');
}

function msToTime(ms) {
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    hours = hours % 24;
    minutes = minutes % 60;
    seconds = seconds % 60;

    return {
        days: days,
        hours: hours,
        minutes: minutes
    };
}

function getGameDetailsFromInteraction(interaction) {
    const twitterSource = interaction.options.getString(CommandsOption.TWITTER);
    const steamSource = interaction.options.getString(CommandsOption.STEAM);
    const releaseDate = interaction.options.getString(CommandsOption.RELEASE_DATE);

    return { twitterSource, steamSource, releaseDate };
}

function buildGameObject(gameName, newDetails, existingGame = {}) {
    const newGame = {
        name: gameName,
        sources: [],
        releaseDate: existingGame.releaseDate
    };

    // Preserve existing sources that aren't being updated
    if (existingGame.sources) {
        newGame.sources = existingGame.sources.filter(source => {
            const hasTwitter = source[SourceType.TWITTER];
            const hasSteam = source[SourceType.STEAM_INTERNAL] || source[SourceType.STEAM_EXTERNAL];
            return (!newDetails.twitterSource && hasTwitter) || (!newDetails.steamSource && hasSteam);
        });
    }

    // Add new Twitter source
    if (newDetails.twitterSource) {
        newGame.sources.push({
            [SourceType.TWITTER]: newDetails.twitterSource,
            lastUpdate: null
        });
    }

    // Add new Steam sources
    if (newDetails.steamSource) {
        newGame.sources.push({
            [SourceType.STEAM_INTERNAL]: newDetails.steamSource,
            lastUpdate: null
        });
        newGame.sources.push({
            [SourceType.STEAM_EXTERNAL]: newDetails.steamSource,
            lastUpdate: null
        });
    }

    // Update release date if provided
    if (newDetails.releaseDate) {
        newGame.releaseDate = parseDate(newDetails.releaseDate);
    }

    return newGame;
}

/**
 * Fetches and processes Steam game data including name, release date, and other details
 * @param {string} appID - The Steam application ID
 * @param {string} [countryCode='us'] - The country code for pricing (ISO 3166-1)
 * @returns {Object|null} - Object containing game data or null if not found
 */
async function getSteamGameData(appID, countryCode = 'us') {
    try {
        const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appID}&cc=${countryCode.toLowerCase()}&l=english`);
        const gameData = response.data[appID]?.data;

        if (!gameData || !response.data[appID]?.success) {
            return null;
        }

        // Create result object with available data
        const result = {
            name: gameData.name,
            appId: appID,
            releaseDate: null,
            formattedReleaseDate: null,
            publishers: gameData.publishers || [],
            developers: gameData.developers || [],
            headerImage: gameData.header_image || null,
            type: gameData.type || null,
            // Add review data properties
            reviewScore: null,
            reviewCount: null,
            reviewDescription: null,
            // Add price information
            price: null,
            discountPercent: null,
            originalPrice: null,
            currencyCode: null,
            isFree: false // Default to false unless explicitly marked free
        };

        // More accurate determination of free-to-play status
        // Only mark as free if explicitly tagged as free or has the "Free to Play" genre
        if (gameData.is_free === true) {
            // Check if it's truly free or just not priced yet
            if (gameData.genres && gameData.genres.some(genre => 
                genre.description === "Free to Play" || 
                genre.id === "37" // Steam's ID for Free to Play genre
            )) {
                result.isFree = true;
            } else if (gameData.release_date && gameData.release_date.coming_soon === false) {
                // If the game is released and marked as free, it's probably free
                result.isFree = true;
            }
        }

        // Extract price information if available
        if (gameData.price_overview) {
            const priceData = gameData.price_overview;
            result.price = priceData.final_formatted;
            result.originalPrice = priceData.initial_formatted;
            result.discountPercent = priceData.discount_percent;
            result.currencyCode = priceData.currency;
        }

        // Process release date if available
        if (gameData.release_date && gameData.release_date.date) {
            const releaseDate = gameData.release_date.date;

            // Handle if date is only a year
            if (releaseDate.length === 4 && !isNaN(parseInt(releaseDate, 10))) {
                // Don't set a specific date for year-only releases
                result.releaseYear = parseInt(releaseDate, 10);
            } else {
                // Parse full date
                const parsedDate = new Date(releaseDate);
                if (!isNaN(parsedDate.getTime())) {
                    result.releaseDate = parsedDate;
                    // Format date as YYYY-MM-DD for database storage
                    result.formattedReleaseDate = `${parsedDate.getFullYear()}-${(parsedDate.getMonth() + 1).toString().padStart(2, '0')}-${parsedDate.getDate().toString().padStart(2, '0')}`;
                }
            }
        }
        
        // Add review information if game has been released and has reviews
        try {
            // Fetch review data from Steam Store API
            const reviewResponse = await axios.get(`https://store.steampowered.com/appreviews/${appID}?json=1&language=all&purchase_type=all`);
            const reviewData = reviewResponse.data;
            
            if (reviewData && reviewData.success) {
                // Extract review statistics
                if (reviewData.query_summary) {
                    const summary = reviewData.query_summary;
                    
                    if (summary.review_score_desc) {
                        result.reviewDescription = summary.review_score_desc;
                    }
                    
                    if (summary.total_reviews !== undefined) {
                        result.reviewCount = summary.total_reviews;
                    }
                    
                    if (summary.total_positive !== undefined && summary.total_reviews > 0) {
                        // Calculate positive percentage
                        result.reviewScore = Math.round((summary.total_positive / summary.total_reviews) * 100);
                    }
                }
            }
        } catch (reviewError) {
            // Just log the error but don't fail the whole function
            console.error(`Error fetching review data for appID ${appID}:`, reviewError.message);
        }

        return result;
    } catch (error) {
        console.error(`Error fetching Steam data for appID ${appID}:`, error.message);
        return null;
    }
}

/**
 * Legacy function maintained for backward compatibility
 * @param {string} appID - The Steam application ID
 * @returns {Date|null} - Release date as Date object or null
 * @deprecated Use getSteamGameData instead
 */
async function getSteamGameReleaseDate(appID) {
    const gameData = await getSteamGameData(appID);
    return gameData ? gameData.releaseDate : null;
}

/**
 * Validates if a string is a properly formatted URL and contains specified domains
 * @param {string} url - The URL to validate
 * @param {string[]} [allowedDomains=[]] - Array of allowed domains
 * @returns {boolean} - Whether the URL is valid
 */
function isValidUrl(url, allowedDomains = []) {
    try {
        const urlObj = new URL(url);
        
        // Check protocol
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            return false;
        }
        
        // Check domain if allowedDomains are specified
        if (allowedDomains.length > 0) {
            return allowedDomains.some(domain => urlObj.hostname.includes(domain));
        }
        
        return true;
    } catch (e) {
        // Invalid URL format
        return false;
    }
}

/**
 * Formats ISO date string (YYYY-MM-DD) to a human-readable format
 * @param {string} isoDate - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
function formatHumanReadableDate(isoDate) {
    if (!isoDate) return 'Unknown';
    
    try {
        const date = new Date(isoDate);
        
        // Check if valid date
        if (isNaN(date.getTime())) {
            return isoDate; // Return original if parsing failed
        }
        
        // Format options
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        console.error(`Error formatting date ${isoDate}:`, error);
        return isoDate;
    }
}

/**
 * Determines the appropriate country code based on the interaction
 * @param {Interaction} interaction - Discord interaction
 * @returns {string} - ISO country code (defaults to 'us' if not determinable)
 */
function getCountryCodeFromInteraction(interaction) {
    // Discord doesn't directly provide country information
    // We could use server region if available or default to 'us'
    // If you have a database storing user preferences, you could look it up there
    try {
        // This is a theoretical implementation 
        // If you implement user settings, you could use those instead
        const locale = interaction.locale || 'en-US';
        
        // Map common locales to country codes
        const localeMap = {
            'en-US': 'us',
            'en-GB': 'gb',
            'fr': 'fr',
            'de': 'de',
            'es-ES': 'es',
            'ru': 'ru',
            'ja': 'jp',
            'ko': 'kr',
            'zh-CN': 'cn',
            'pt-BR': 'br',
            'it': 'it',
            // Add more mappings as needed
        };
        
        // Get the country code from the locale if possible
        if (locale && localeMap[locale]) {
            return localeMap[locale];
        }
        
        // Try to extract from locale format (if it's like 'en-US')
        const parts = locale.split('-');
        if (parts.length > 1 && parts[1].length === 2) {
            return parts[1].toLowerCase();
        }
        
        return 'us'; // Default to US
    } catch (error) {
        console.error('Error getting country code:', error);
        return 'us'; // Default to US
    }
}

module.exports = {
    normalizeName,
    parseDate,
    formatDate,
    isGameRegistered,
    getGameSuggestionsByName,
    getGameByName,
    getGameInfos,
    msToTime,
    getGameDetailsFromInteraction,
    buildGameObject,
    getSteamGameData,
    getSteamGameReleaseDate,
    isValidUrl,
    formatHumanReadableDate,
    getCountryCodeFromInteraction
};