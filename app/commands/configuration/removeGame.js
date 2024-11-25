const { SlashCommandBuilder } = require('discord.js');
const CommandHelper = require('../../commandHelper');
const CommandsName = require('../../constants/commandsName');
const CommandsOption = require('../../constants/commandsOption');
const DatabaseManager = require('../../database');
const logger = require('../../logger');
const ReleaseManager = require('../../releaseManager');

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
            ReleaseManager.getInstance().removeCronJob(gameName);
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