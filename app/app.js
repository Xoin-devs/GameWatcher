const client = require('./client');
const Discord = require('discord.js');
const Scheduler = require('./scheduler');
const { token } = require('./config');
const { initCommandsLocally } = require('./commandHandler');
const { WatcherManager } = require('./watchers/watcherManager');
const { SteamWatcher } = require('./watchers/steamWatcher');
const { TwitterWatcher } = require('./watchers/twitterWatcher');

client.once(Discord.Events.ClientReady, async () => {
    initCommandsLocally();

    await Scheduler.init();

    const watcherManager = new WatcherManager();
    await watcherManager.addWatcher(new SteamWatcher());
    await watcherManager.addWatcher(new TwitterWatcher());
    await watcherManager.startAll();
});

client.login(token);

////////////////////////
// Test zone

////////////////////////