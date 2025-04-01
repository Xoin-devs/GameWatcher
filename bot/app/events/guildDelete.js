const { Events } = require('discord.js');
const logger = require('@shared/logger');
const DatabaseManager = require('@shared/database');

module.exports = {
    name: Events.GuildDelete,
    async execute(guild) {
        logger.info(`Bot was removed from guild: ${guild.name} (ID: ${guild.id})`);

        // Perform any cleanup tasks here, such as removing guild data from the database
        try {
            const db = await DatabaseManager.getInstance();
            await db.cleanupGuild(guild.id);
            logger.info(`Successfully removed guild data for guild ID: ${guild.id}`);
        } catch (error) {
            logger.error(`Failed to remove guild data for guild ID: ${guild.id}`, error);
        }
    },
};