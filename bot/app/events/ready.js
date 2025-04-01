const { Events } = require('discord.js');
const { WatcherManager } = require('@bot/watchers/watcherManager');
const { SteamExternalWatcher } = require('@bot/watchers/steamExternalWatcher');
const { SteamInternalWatcher } = require('@bot/watchers/steamInternalWatcher');
const { TwitterWatcher } = require('@bot/watchers/twitterWatcher');
const logger = require('@shared/logger');
const ReleaseManager = require('@bot/releaseManager');
const DatabaseManager = require('@shared/database');
const { createWebhook: createWebhookUtil } = require('@bot/webhookManager');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Logged in as ${client.user.tag}\n`);

        logger.info('Verifying guild memberships...');
        await verifyGuildsInDatabase(client);

        logger.info('Starting scheduler...');
        const watcherManager = WatcherManager.getInstance()
        await watcherManager.addWatcher(new SteamExternalWatcher());
        await watcherManager.addWatcher(new SteamInternalWatcher());
        await watcherManager.addWatcher(new TwitterWatcher());
        await watcherManager.startAll();

        logger.info('Starting release announcer...');
        const releaseAnnouncer = ReleaseManager.getInstance();
        releaseAnnouncer.startCronJobs();

        logger.info('Ready!\n');
    },
};

async function verifyGuildsInDatabase(client) {
    try {
        const db = await DatabaseManager.getInstance();
        const storedGuilds = await db.getGuilds();

        if (!storedGuilds || storedGuilds.length === 0) {
            logger.debug('No guilds found in database to verify');
            return;
        }

        logger.info(`Verifying ${storedGuilds.length} guilds from database`);

        // Get the set of guild IDs the bot is currently in
        const currentGuilds = new Map(client.guilds.cache.map(guild => [guild.id, guild.name]));

        for (const guild of storedGuilds) {
            const guildId = guild.id;

            // Check if bot is still in this guild
            if (currentGuilds.has(guildId) == false) {
                logger.warn(`Bot is no longer in guild ${guildId}, cleaning up guild data`);
                // await db.cleanupGuild(guildId);
                continue;
            }

            const guildName = currentGuilds.get(guildId);

            // Check if the channel still exists
            const channel = client.channels.cache.get(guild.channel_id);
            const channelId = guild.channel_id;
            const channelName = channel ? channel.name : 'unknown';
            if (channel == null) {
                logger.warn(`Channel ${channelName} (${channelId}) no longer exists in guild ${guildName} (${guildId}), cleaning up guild data`);
                // await db.cleanupGuild(guildId);
                continue;
            }

            // Check if the webhook still exists
            try {
                logger.debug(`Fetching webhooks for channel ${channelName} (${channelId}) in guild ${guildName} (${guildId})`);
                const webhooks = await channel.fetchWebhooks();

                if (!webhooks || webhooks.size === 0) {
                    logger.warn(`No webhooks found for channel ${channelName} (${channelId}) in guild ${guildName} (${guildId})`);
                    const webhookUrl = await createWebhook(client, channelId);
                    await db.updateGuildWebhook(guildId, webhookUrl);
                    continue;
                }

                const botWebhook = webhooks.find(w => w.name === client.user.username);

                if (!botWebhook) {
                    logger.warn(`Bot webhook not found in channel ${channelName} (${channelId}), creating new webhook`);
                    const webhookUrl = await createWebhook(client, channelId);
                    await db.updateGuildWebhook(guildId, webhookUrl);
                    continue;
                }

                if (!guild.webhook_url) {
                    logger.warn(`Webhook url not set for channel ${channelName} (${channelId}) in guild ${guildName} (${guildId}), updating it`);
                    await db.updateGuildWebhook(guildId, botWebhook.url);
                }

                logger.debug(`Verified guild ${guildName} (${guildId})`);
                logger.debug(`Channel ${channelName} (${channelId}) is valid with webhook ${botWebhook.id}`);
            } catch (error) {
                logger.error(`Error fetching webhooks for channel ${channelName} (${channelId}): ${error.message}`);
                logger.info(`Attempting to create new webhook for channel ${channelName} (${channelId})`);
                try {
                    const webhookUrl = await createWebhook(client, channelId);
                    logger.info(`Webhook created for channel ${channelName} (${channelId}): ${webhookUrl}`);
                    await db.updateGuildWebhook(guildId, webhookUrl);
                } catch (webhookError) {
                    logger.error(`Failed to create webhook: ${webhookError.message}`);
                    logger.warn(`Unable to verify webhook for channel ${channelName} (${channelId}), cleaning up guild data`);
                    // await db.cleanupGuild(guildId);
                }
            }
        }

        logger.info('Guild verification completed');
    } catch (error) {
        logger.error('Error verifying guilds:', error.message);
    }
}

async function createWebhook(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);

        if (!channel || !channel.isTextBased()) {
            throw new Error('Channel not found or not a text channel');
        }

        const webhook = await createWebhookUtil(channel, {
            name: client.user.username,
            avatar: client.user.avatarURL()
        });

        return webhook.url;
    } catch (error) {
        logger.error(`Error creating webhook: ${error.message}`);
        throw error;
    }
}