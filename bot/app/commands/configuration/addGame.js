const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('../../constants/commandsName');
const CommandsOption = require('../../constants/commandsOption');
const Utils = require('../../utils');
const DatabaseManager = require('../../database');
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
        const db = await DatabaseManager.getInstance();
        const gameName = interaction.options.getString(CommandsOption.NAME);

        const existingGame = await db.getGame(gameName);
        if (existingGame) {
            await interaction.reply('This game is already registered');
            return;
        }

        try {
            const gameDetails = Utils.getGameDetailsFromInteraction(interaction);
            const gameObject = Utils.buildGameObject(gameName, gameDetails);

            logger.debug(`Adding game with details:`, {
                name: gameName,
                sources: gameObject.sources,
                releaseDate: gameObject.releaseDate
            });

            await db.addGame(
                gameName,
                gameObject.sources,
                gameObject.releaseDate
            );
            
            const message = `Game ${gameName} added successfully!`;
            logger.info(message);
            await interaction.reply(message);
            
            const newGame = await db.getGame(gameName);
            ReleaseManager.getInstance().addOrUpdateCronJob(newGame);
        } catch (error) {
            const message = `Failed to register game ${gameName}: ${error.message}`;
            logger.error(message, error);
            await interaction.reply(message);
        }
    },
};