const timeConstants = require('../constants/timeConstants.js');
const logger = require('../logger.js');
const { SteamInternalWrapper } = require('../wrappers/steamInternalWrapper.js');
const { Watcher } = require('./watcher.js');
const SourceType = require('../constants/sourceType');

class SteamInternalWatcher extends Watcher {
    constructor() {
        super(timeConstants.FIVE_HOURS);
        this.steamInternalWrapper = new SteamInternalWrapper();
    }

    async init() { }

    async fetchNews(source) {
        if (source[SourceType.STEAM_INTERNAL]) {
            return await this.steamInternalWrapper.getNews(source[SourceType.STEAM_INTERNAL]);
        }
    }

    async sendNews(news) {
        await this.messageUtil.sendSteamNewsToAllChannels(news);
    }
}

module.exports = { SteamInternalWatcher };