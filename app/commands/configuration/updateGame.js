const { readConfig, writeConfig } = require('../../config');
const { SlashCommandBuilder } = require("discord.js");
const CommandHelper = require('../../commandHelper');
const CommandsName = require("../../constants/commandsName");
const CommandsOption = require("../../constants/commandsOption");
const Utils = require('../../utils');
const logger = require('../../logger');
const ReleaseManager = require('../../releaseManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.UPDATE_GAME)
        .setDescription("Update a game in the list")
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName(CommandsOption.NAME)
                .setDescription('Name of the game')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName(CommandsOption.TWITTER)
                .setDescription('Twitter source of the game')
                .setRequired(false))
        .addStringOption(option =>
            option.setName(CommandsOption.STEAM)
                .setDescription('Steam source of the game')
                .setRequired(false))
        .addStringOption(option =>
            option.setName(CommandsOption.RELEASE_DATE)
                .setDescription('Release date of the game (DD/MM/YYYY)')
                .setRequired(false)),
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

        const existingGame = config.games.find(game => game.name === gameName);
        const gameDetails = Utils.getGameDetailsFromInteraction(interaction);
        const updatedGame = Utils.buildGameObject(gameName, gameDetails, existingGame);

        const gameIndex = config.games.findIndex(game => game.name === gameName);
        config.games[gameIndex] = updatedGame;

        try {
            writeConfig(config);
            const message = `Game ${gameName} updated successfully!`;
            logger.info(message);
            await interaction.reply(message);
            ReleaseManager.getInstance().addOrUpdateCronJob(updatedGame);
        } catch (error) {
            const message = `Failed to update game ${gameName}`;
            logger.error(message, error);
            await interaction.reply(message);
        }
    }
}