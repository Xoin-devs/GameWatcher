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
            if (source.twitter) {
                gameInfo.push(`twitter: ${source.twitter}`);
            }
            if (source.steam) {
                gameInfo.push(`steam: ${source.steam}`);
            }
        });
    }
    if (game.releaseDate) {
        gameInfo.push(`release_date: ${game.releaseDate}`);
    }
    return gameInfo.join(' ');
}

module.exports = {
    normalizeName,
    parseDate,
    isGameRegistered,
    getGameSuggestionsByName,
    getGameByName,
    getGameInfos,
};