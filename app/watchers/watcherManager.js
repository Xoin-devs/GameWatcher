class WatcherManager {
    constructor() {
        this.watchers = [];
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
}

module.exports = { WatcherManager };