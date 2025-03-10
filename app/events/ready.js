const { Events } = require('discord.js');
const { WatcherManager } = require('../watchers/watcherManager');
const { SteamExternalWatcher } = require('../watchers/steamExternalWatcher');
const { SteamInternalWatcher } = require('../watchers/steamInternalWatcher');
const { TwitterWatcher } = require('../watchers/twitterWatcher');
const logger = require('../logger');
const ReleaseManager = require('../releaseManager');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Logged in as ${client.user.tag}\n`);

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