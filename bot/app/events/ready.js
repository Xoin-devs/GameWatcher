const { Events } = require('discord.js');
const { WatcherManager } = require('@bot/watchers/watcherManager');
const { SteamExternalWatcher } = require('@bot/watchers/steamExternalWatcher');
const { SteamInternalWatcher } = require('@bot/watchers/steamInternalWatcher');
const { TwitterWatcher } = require('@bot/watchers/twitterWatcher');
const logger = require('@shared/logger');
const ReleaseManager = require('@bot/releaseManager');
const DatabaseManager = require('@shared/database');

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
        const currentGuildIds = new Set(client.guilds.cache.map(guild => guild.id));
        
        for (const guild of storedGuilds) {
            const guildId = guild.id;
            
            // Check if bot is still in this guild
            if (!currentGuildIds.has(guildId)) {
                logger.warn(`Bot is no longer in guild ${guildId}, cleaning up guild data`);
                await db.cleanupGuild(guildId);
            } else {
                logger.debug(`Verified bot is still in guild ${guildId}`);
            }
        }
        
        logger.info('Guild verification completed');
    } catch (error) {
        logger.error('Error verifying guilds:', error.message);
    }
}