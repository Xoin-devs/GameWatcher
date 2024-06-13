const client = require('./client');
const Discord = require('discord.js');
const { token } = require('./config');
const { registerCommands } = require('./commands');
const Scheduler = require('./scheduler');
const { WatcherManager, TwitterWatcher, SteamWatcher } = require('./watchers/steamWatcher');

client.once(Discord.Events.ClientReady, async () => {
    await registerCommands();
    console.log('Bot is ready');

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