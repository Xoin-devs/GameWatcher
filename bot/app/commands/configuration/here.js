const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('../../constants/commandsName');
const logger = require('../../logger');
const DatabaseManager = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.HERE)
        .setDescription("Tell the bot to spread news in this channel")
        .setDMPermission(false),
    async execute(interaction) {
        const channelId = interaction.channel.id;
        const guildId = interaction.guild.id;

        const db = await DatabaseManager.getInstance();
        await db.addGuild(guildId, channelId);

        logger.info(`Channel ${channelId} is now the news channel for guild ${guildId}`);
        await interaction.reply('I will spread news in this channel');
    }
};