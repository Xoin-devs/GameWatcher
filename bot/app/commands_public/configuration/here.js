const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const CommandsName = require('@bot/constants/commandsName');
const logger = require('@shared/logger');
const DatabaseManager = require('@shared/database');
const { createWebhook } = require('@bot/webhookManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.HERE)
        .setDescription("Tell the bot to spread news in this channel")
        .setDMPermission(false),
    async execute(interaction) {
        const channelId = interaction.channel.id;
        const guildId = interaction.guild.id;
        
        try {
            // Check bot permissions first
            const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
            const hasPermission = botMember.permissions.has(PermissionsBitField.Flags.ManageWebhooks);
            
            if (!hasPermission) {
                logger.error(`Bot lacks ManageWebhooks permission in guild ${guildId}`);
                await interaction.reply({
                    content: '❌ I need the "Manage Webhooks" permission to set up news delivery. Please ask a server admin to grant me this permission.',
                    ephemeral: true
                });
                return;
            }
            
            // Defer the reply to give more time for processing
            await interaction.deferReply();
            
            const db = await DatabaseManager.getInstance();
            
            // Check if the guild already has a webhook in another channel
            const existingGuildData = await db.getGuildById(guildId);
            let oldChannelWebhookFound = false;
            let oldChannelName = '';
            
            if (existingGuildData && existingGuildData.channel_id !== channelId) {
                oldChannelWebhookFound = true;
                
                // Try to get the old channel to delete the webhook
                try {
                    const oldChannel = await interaction.client.channels.fetch(existingGuildData.channel_id);
                    oldChannelName = oldChannel ? `#${oldChannel.name}` : 'unknown channel';
                    
                    // Get webhooks in the old channel
                    const oldWebhooks = await oldChannel.fetchWebhooks();
                    const oldBotWebhook = oldWebhooks.find(w => w.name === interaction.client.user.username);
                    
                    if (oldBotWebhook) {
                        logger.info(`Deleting old webhook (ID: ${oldBotWebhook.id}) in channel ${oldChannel.id}`);
                        await oldBotWebhook.delete(`Moving webhook to channel ${channelId}`);
                        logger.info(`Successfully deleted old webhook in ${oldChannel.id}`);
                    }
                } catch (error) {
                    // Don't fail if we can't delete the old webhook
                    logger.warn(`Couldn't delete webhook in old channel: ${error.message}. Will create a new one anyway.`);
                }
            }
            
            // Get webhooks in the current channel
            logger.info(`Checking for existing webhooks in channel ${channelId} (Guild: ${guildId})`);
            const webhooks = await interaction.channel.fetchWebhooks()
                .catch(error => {
                    logger.error(`Failed to fetch webhooks: ${error.message}, ${error.code || 'No error code'}`);
                    throw new Error(`Failed to fetch webhooks: ${error.message}`);
                });
            
            let webhook = webhooks.find(w => w.name === interaction.client.user.username);
            let responseMessage;
            
            // Create a webhook if one doesn't exist in this channel
            if (!webhook) {
                logger.info(`Creating new webhook for channel ${channelId} in guild ${guildId}`);
                try {
                    webhook = await createWebhook(interaction.channel, {
                        name: interaction.client.user.username,
                        avatar: interaction.client.user.avatarURL(),
                        reason: 'Game News Forge news delivery'
                    });
                    logger.info(`New webhook created with ID ${webhook.id}`);
                    
                    if (oldChannelWebhookFound) {
                        responseMessage = `✅ I'll now send game news and updates in this channel instead of ${oldChannelName}!`;
                    } else {
                        responseMessage = `✅ I'll now send game news and updates in this channel!`;
                    }
                } catch (webhookError) {
                    const errorDetails = `Code: ${webhookError.code || 'None'}, Message: ${webhookError.message}`;
                    logger.error(`Failed to create webhook: ${errorDetails}`);
                    throw new Error(`Failed to create webhook: ${errorDetails}`);
                }
            } else {
                logger.info(`Reusing existing webhook with ID ${webhook.id} in the current channel`);
                
                if (oldChannelWebhookFound) {
                    responseMessage = `✅ I'll now send game news and updates in this channel instead of ${oldChannelName}!`;
                } else {
                    responseMessage = `✅ I'm already set up to send updates in this channel!`;
                }
            }
            
            if (!webhook.url) {
                logger.error(`Created webhook has no URL, webhook ID: ${webhook.id}`);
                throw new Error('Created webhook is missing URL property');
            }
            
            // Update database with new webhook info
            await db.addGuild(guildId, channelId, webhook.url);
            logger.info(`Channel ${channelId} is now the news channel for guild ${guildId} with webhook ${webhook.id}`);
            
            await interaction.editReply({
                content: responseMessage,
                ephemeral: false
            });
        } catch (error) {
            logger.error(`Error setting up news channel: ${error.message}`);
            
            let errorMessage = '❌ I couldn\'t set up this channel for news.';
            
            if (error.message.includes('Missing Permissions') || error.code === 50013) {
                errorMessage += ' I don\'t have permission to manage webhooks in this channel. Please ask an admin to grant me the "Manage Webhooks" permission.';
            } else if (error.code === 30007) {
                errorMessage += ' This channel has reached the maximum number of webhooks (10). Please delete some existing webhooks first.';
            } else if (error.code === 50001) {
                errorMessage += ' I don\'t have access to view this channel properly. Please check my role permissions.';
            } else {
                errorMessage += ` Error details: ${error.message}`;
            }
            
            // Use editReply if deferred, otherwise use reply
            if (interaction.deferred) {
                await interaction.editReply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    }
};