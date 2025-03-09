const { isDev, isProd } = require('../config.js');
const timeConstants = require('../constants/timeConstants.js');
const { SteamInternalWrapper } = require('../wrappers/steamInternalWrapper.js');
const { Watcher } = require('./watcher.js');
const SourceType = require('../constants/sourceType');

class SteamInternalWatcher extends Watcher {
    constructor() {
        if (isDev()) {
            super(timeConstants.ONE_MINUTES);
        } else if (isProd()) {
            super(timeConstants.TWO_HOURS + timeConstants.FIFTEEN_MINUTES);
        }
        
        this.steamInternalWrapper = new SteamInternalWrapper();
    }

    async init() { }

    async fetchNews(source) {
        if (source[SourceType.STEAM_INTERNAL]) {
            this.logger.debug(`Checking news for source ${JSON.stringify(source)}`);
            return await this.steamInternalWrapper.getNews(source[SourceType.STEAM_INTERNAL]);
        }
    }

    async sendNews(news, gameName) {
        await this.messageUtil.sendSteamNewsToAllChannels(news, gameName);
    }
}

module.exports = { SteamInternalWatcher };