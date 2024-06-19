const { Events } = require('discord.js');
const Scheduler = require('../scheduler');
const { WatcherManager } = require('../watchers/watcherManager');
const { SteamExternalWatcher } = require('../watchers/steamExternalWatcher');
const { SteamInternalWatcher } = require('../watchers/steamInternalWatcher');
const { TwitterWatcher } = require('../watchers/twitterWatcher');
const logger = require('../logger');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        logger.info(`Logged in as ${client.user.tag}\n`);
        await Scheduler.init();

        const watcherManager = WatcherManager.getInstance()
        await watcherManager.addWatcher(new SteamExternalWatcher());
        await watcherManager.addWatcher(new SteamInternalWatcher());
        await watcherManager.addWatcher(new TwitterWatcher());
        await watcherManager.startAll();
    },
};