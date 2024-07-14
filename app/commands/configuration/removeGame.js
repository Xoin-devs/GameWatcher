const { readConfig, writeConfig } = require('../../config');
const { SlashCommandBuilder } = require('discord.js');
const CommandHelper = require('../../commandHelper');
const CommandsName = require('../../constants/commandsName');
const CommandsOption = require('../../constants/commandsOption');
const Utils = require('../../utils');
const logger = require('../../logger');
const ReleaseManager = require('../../releaseManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.REMOVE_GAME)
        .setDescription('Remove a registered game from the list of watched games')
        .addStringOption(option =>
            option.setName(CommandsOption.NAME)
                .setDescription('Name of the game')
                .setRequired(true)
                .setAutocomplete(true)),
    async autocomplete(interaction) {
        CommandHelper.autoCompleteGameName(interaction);
    },
    async execute(interaction) {
        const config = readConfig();
        const gameName = interaction.options.getString(CommandsOption.NAME);

        if (!Utils.isGameRegistered(config, gameName)) {
            await interaction.reply('This game is not registered');
            return;
        }

        config.games = config.games.filter(game => Utils.normalizeName(game.name) !== Utils.normalizeName(gameName));

        try {
            writeConfig(config);
            ReleaseManager.getInstance().removeCronJob(gameName);
            const message = `Removed game: ${gameName}`;
            logger.info(message);
            await interaction.reply(message);
        } catch (error) {
            const message = `Failed to remove game: ${gameName}`;
            logger.error(message, error);
            await interaction.reply(message);
            return;
        }
    },
};