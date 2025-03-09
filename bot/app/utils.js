const CommandsOption = require('@bot/constants/commandsOption');
const SourceType = require('@bot/constants/sourceType');

function normalizeName(name) {
    return name.toLowerCase().replace(/\s+/g, '');
}

function parseDate(dateInput) {
    if (!dateInput) return null;
    const [day, month, year] = dateInput.split('/');
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    
    // Validate the date is correct
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date format: ${dateInput}`);
    }
    
    return isoDate;
}

function formatDate(isoDate) {
    if (!isoDate) return null;
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
        gameInfo.push(`release_date: ${formatDate(game.releaseDate)}`);
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
    buildGameObject
};