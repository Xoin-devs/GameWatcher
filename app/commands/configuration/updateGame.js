const { SlashCommandBuilder } = require("discord.js");
const CommandHelper = require('../../commandHelper');
const CommandsName = require("../../constants/commandsName");
const CommandsOption = require("../../constants/commandsOption");
const Utils = require('../../utils');
const logger = require('../../logger');
const ReleaseManager = require('../../releaseManager');
const DatabaseManager = require('../../database');

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
        const db = await DatabaseManager.getInstance();
        const gameName = interaction.options.getString(CommandsOption.NAME);

        const existingGame = await db.getGame(gameName);
        if (!existingGame) {
            await interaction.reply('This game is not registered');
            return;
        }

        const gameDetails = Utils.getGameDetailsFromInteraction(interaction);
        const success = await db.updateGame(
            gameName,
            gameDetails.sources,
            gameDetails.releaseDate
        );

        if (success) {
            const message = `Game ${gameName} updated successfully!`;
            logger.info(message);
            await interaction.reply(message);
            const updatedGame = await db.getGame(gameName);
            ReleaseManager.getInstance().addOrUpdateCronJob(updatedGame);
        } else {
            const message = `Failed to update game ${gameName}`;
            logger.error(message);
            await interaction.reply(message);
        }
    }
}