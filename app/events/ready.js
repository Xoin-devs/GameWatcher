const { Events } = require('discord.js');
const Scheduler = require('../scheduler');
const { WatcherManager } = require('../watchers/watcherManager');
const { SteamWatcher } = require('../watchers/steamWatcher');
const { TwitterWatcher } = require('../watchers/twitterWatcher');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}\n`);
        await Scheduler.init();

        const watcherManager = new WatcherManager();
        await watcherManager.addWatcher(new SteamWatcher());
        await watcherManager.addWatcher(new TwitterWatcher());
        await watcherManager.startAll();
    },
};