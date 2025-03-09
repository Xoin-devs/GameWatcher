const logger = require('@shared/logger');

cron = require('node-cron');

class WatcherManager {
    constructor() {
        if (WatcherManager.instance) {
            return WatcherManager.instance;
        }

        this.watchers = [];
        WatcherManager.instance = this;
    }

    async addWatcher(watcher) {
        await watcher.init();
        this.watchers.push(watcher);
    }

    async startAll() {
        for (const watcher of this.watchers) {
            const cronExpression = watcher.getCronExpression();
            logger.info(`Starting watcher with cron expression ${cronExpression}`);
            cron.schedule(cronExpression, async () => {
                await watcher.checkNews();
            });
        }
    }

    static getInstance() {
        if (!WatcherManager.instance) {
            WatcherManager.instance = new WatcherManager();
        }

        return WatcherManager.instance;
    }
}

module.exports = { WatcherManager };