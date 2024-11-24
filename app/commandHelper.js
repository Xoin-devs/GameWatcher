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
        suggestions.map(game => {
            const truncatedName = game.name.length > 25 ? game.name.substring(0, 25) : game.name;
            return { name: truncatedName, value: truncatedName };
        }),
    );
}

module.exports = {
    autoCompleteGameName
}
