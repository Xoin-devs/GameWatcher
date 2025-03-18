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
            const webUrl = process.env.WEB_URL;
            const webPort = process.env.WEB_PORT;
            
            if (!webUrl) {
                logger.error('WEB_URL environment variable is not set');
                await interaction.reply('Sorry, the dashboard URL is not configured properly. Please contact the bot administrator.');
                return;
            }

            logger.info(`User ${interaction.user.id} requested the dashboard URL`);
            await interaction.reply(`You can access the bot dashboard at: ${webUrl}:${webPort}`);
        } catch (error) {
            logger.error(`Error in configure command: ${error.message}`, error);
            await interaction.reply('An error occurred while processing your request. Please try again later.');
        }
    }
};