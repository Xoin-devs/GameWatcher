const { SlashCommandBuilder } = require('discord.js');
const CommandHelper = require('../../commandHelper');
const CommandsName = require('../../constants/commandsName');
const CommandsOption = require('../../constants/commandsOption');
const Utils = require('../../utils');
const logger = require('../../logger');
const DatabaseManager = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.GET_GAME)
        .setDescription("Get a registered game's informations")
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
        const gameName = interaction.options.getString(CommandsOption.NAME);
        const db = await DatabaseManager.getInstance();
        const game = await db.getGame(gameName);

        if (!game) {
            await interaction.reply('This game is not registered');
            return;
        }

        const gameInfos = Utils.getGameInfos(game);
        const gameInfosFormatted = `\`\`\`${gameInfos}\`\`\``;

        logger.info(`Getting information about game: ${gameName} | ${gameInfos}`);
        await interaction.reply(gameInfosFormatted);
    },
};