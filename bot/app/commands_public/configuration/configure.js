const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('@bot/constants/commandsName');
const logger = require('@shared/logger');
const DatabaseManager = require('@shared/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.CONFIGURE)
        .setDescription("Open the dashboard for configuring the bot")
        .setDMPermission(false),
    async execute(interaction) {
        try {
            logger.info(`User ${interaction.user.id} requested the dashboard URL`);

            await interaction.reply({
                content: `✨ **GameWatcher Dashboard** ✨\nConfigure your bot settings here: [Open Dashboard](http://oslo.ovh)\nUse the dashboard game tracking (and more soon!)`,
                ephemeral: true
            });
        } catch (error) {
            logger.error(`Error in configure command: ${error.message}`, error);
            await interaction.reply('An error occurred while processing your request. Please try again later.');
        }
    }
};