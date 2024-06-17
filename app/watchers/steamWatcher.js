const timeConstants = require('../constants/timeConstants');
const { SteamWrapper } = require('../wrappers/steamWrapper');
const { Watcher } = require('./watcher.js');

class SteamWatcher extends Watcher {
    constructor() {
        super(timeConstants.FIVE_HOURS);
        this.steamWrapper = new SteamWrapper();
    }

    async init() { }

    async fetchNews(source) {
        if (source.steam) {
            const latestNews = await this.steamWrapper.getNews(source.steam);
            return latestNews[0];
        }
    }

    async sendNews(news) {
        await this.messageUtil.sendSteamNewsToAllChannels(news);
    }
}

module.exports = { SteamWatcher };