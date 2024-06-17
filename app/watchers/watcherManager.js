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
        for (let watcher of this.watchers) {
            await watcher.checkNews();
            setInterval(async () => {
                await watcher.checkNews();
            }, watcher.checkInterval);
        }
    }

    async checkNewsForGame(gameName) {
        for (let watcher of this.watchers) {
            await watcher.checkNewsForGame(gameName);
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