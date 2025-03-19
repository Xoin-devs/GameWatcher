const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('@bot/constants/commandsName');
const logger = require('@shared/logger');
const DatabaseManager = require('@shared/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.HERE)
        .setDescription("Tell the bot to spread news in this channel")
        .setDMPermission(false),
    async execute(interaction) {
        const channelId = interaction.channel.id;
        const guildId = interaction.guild.id;
        
        try {
            // Check for existing webhooks first
            logger.info(`Checking for existing webhooks in channel ${channelId}`);
            const webhooks = await interaction.channel.fetchWebhooks();
            let webhook = webhooks.find(w => w.name === interaction.client.user.username);
            
            let responseMessage;
            // Create a webhook only if one doesn't exist
            if (!webhook) {
                logger.info(`Creating new webhook for channel ${channelId} in guild ${guildId}`);
                webhook = await interaction.channel.createWebhook({
                    name: interaction.client.user.username,
                    avatar: interaction.client.user.avatarURL()
                });
                logger.info(`New webhook created with ID ${webhook.id}`);
                responseMessage = `✅ I'll now send game news and updates in this channel! (Created a new webhook - please don't rename it)`;
            } else {
                logger.info(`Reusing existing webhook with ID ${webhook.id}`);
                responseMessage = `✅ I'll now send game news and updates in this channel! (Reusing existing webhook)`;
            }
            
            const db = await DatabaseManager.getInstance();
            await db.addGuild(guildId, channelId, webhook.url);

            logger.info(`Channel ${channelId} is now the news channel for guild ${guildId} with webhook ${webhook.id}`);
            await interaction.reply({
                content: responseMessage,
                ephemeral: false
            });
        } catch (error) {
            logger.error(`Error setting up news channel: ${error.message}`);
            await interaction.reply({
                content: '❌ I couldn\'t set up this channel for news. Please make sure I have permission to manage webhooks in this channel.',
                ephemeral: true
            });
        }
    }
};