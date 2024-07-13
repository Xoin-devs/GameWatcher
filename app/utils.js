const SourceType = require('./constants/sourceType');

function normalizeName(name) {
    return name.toLowerCase().replace(/\s+/g, '');
}

function parseDate(dateInput) {
    const [day, month, year] = dateInput.split('/');
    return new Date(`${month}/${day}/${year}`);
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
        const date = new Date(game.releaseDate);
        const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        gameInfo.push(`release_date: ${formattedDate}`);
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

module.exports = {
    normalizeName,
    parseDate,
    isGameRegistered,
    getGameSuggestionsByName,
    getGameByName,
    getGameInfos,
    msToTime
};