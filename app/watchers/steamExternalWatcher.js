const timeConstants = require('../constants/timeConstants.js');
const { SteamExternalWrapper } = require('../wrappers/steamExternalWrapper.js');
const { Watcher } = require('./watcher.js');
const SourceType = require('../constants/sourceType');

class SteamExternalWatcher extends Watcher {
    constructor() {
        super(timeConstants.TWO_HOURS + timeConstants.THIRTY_MINUTES);
        this.steamExternalWrapper = new SteamExternalWrapper();
    }

    async init() { }

    async fetchNews(source) {
        if (source[SourceType.STEAM_EXTERNAL]) {
            return await this.steamExternalWrapper.getNews(source[SourceType.STEAM_EXTERNAL]);
        }
    }

    async sendNews(news) {
        await this.messageUtil.sendSteamNewsToAllChannels(news);
    }
}

module.exports = { SteamExternalWatcher };