const { readConfig } = require('./config');
const CommandsOption = require('./constants/commandsOption');
const Utils = require('./utils');
const logger = require('./logger');

async function autoCompleteGameName(interaction) {
    const config = readConfig();
    const inputGameName = interaction.options.getString(CommandsOption.NAME);
    const suggestions = Utils.getGameSuggestionsByName(config, inputGameName);

    logger.debug(`Found ${suggestions.length} suggestions for ${inputGameName}`);
    await interaction.respond(
        suggestions.map(game => ({ name: game.name, value: game.name })),
    );
}

module.exports = {
    autoCompleteGameName
}
