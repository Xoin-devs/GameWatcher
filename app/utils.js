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

function getGamesByName(config, gameName) {
    return config.games.filter(game => normalizeName(game.name).includes(normalizeName(gameName)));
}

module.exports = {
    normalizeName,
    parseDate,
    isGameRegistered,
    getGamesByName,
};