const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('../../constants/commandsName');
const CommandsOption = require('../../constants/commandsOption');
const Utils = require('../../utils');
const { readConfig, writeConfig } = require('../../config');
const { WatcherManager } = require('../../watchers/watcherManager');
const logger = require('../../logger');
const ReleaseManager = require('../../releaseManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.ADD_GAME)
        .setDescription('Add a new game to the list')
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName(CommandsOption.NAME)
                .setDescription('Name of the game')
                .setRequired(true))
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
    async execute(interaction) {
        const config = readConfig();
        const gameName = interaction.options.getString(CommandsOption.NAME);

        if (Utils.isGameRegistered(config, gameName)) {
            await interaction.reply('This game is already registered');
            return;
        }

        const gameDetails = Utils.getGameDetailsFromInteraction(interaction);
        const newGame = Utils.buildGameObject(gameName, gameDetails);

        config.games.push(newGame);

        try {
            writeConfig(config);
            const message = `Game ${gameName} added successfully!`;
            logger.info(message);
            await interaction.reply(message);
            ReleaseManager.getInstance().addOrUpdateCronJob(newGame);
        } catch (error) {
            const message = `Failed to register game ${gameName}`;
            logger.error(message, error);
            await interaction.reply(message);
        }
    },
};