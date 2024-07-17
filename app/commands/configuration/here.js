const { readConfig, writeConfig } = require('../../config');
const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('../../constants/commandsName');
const logger = require('../../logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.HERE)
        .setDescription("Tell the bot to spread news in this channel")
        .setDMPermission(false),
    async execute(interaction) {
        const channelId = interaction.channel.id;
        const guildId = interaction.guild.id;
        let config = readConfig();

        let guildConfig = config.guilds.find(g => g.guildId === guildId);

        if (guildConfig) {
            guildConfig.channelId = channelId;
        } else {
            config.guilds.push({ guildId, channelId });
        }

        writeConfig(config);
        logger.info(`Channel ${channelId} is now the news channel for guild ${guildId}`);
        await interaction.reply('I will spread news in this channel');
    }
};