const { SlashCommandBuilder } = require('discord.js');
const CommandHelper = require('@bot/commandHelper');
const CommandsName = require('@bot/constants/commandsName');
const CommandsOption = require('@bot/constants/commandsOption');
const DatabaseManager = require('@shared/database');
const logger = require('@shared/logger');
const ReleaseManager = require('@bot/releaseManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.REMOVE_GAME)
        .setDescription('Remove a registered game from the list of watched games')
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName(CommandsOption.NAME)
                .setDescription('Name of the game')
                .setRequired(true)
                .setAutocomplete(true)),
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

        try {
            await db.removeGame(gameName);
            const message = `Removed game: ${gameName}`;
            logger.info(message);
            await interaction.reply(message);
        } catch (error) {
            const message = `Failed to remove game: ${gameName}`;
            logger.error(message, error);
            await interaction.reply(message);
        }
    },
};