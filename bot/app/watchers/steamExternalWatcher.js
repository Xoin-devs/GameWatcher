const { isDev, isProd } = require('@shared/config.js');
const timeConstants = require('@shared/timeConstants.js');
const { SteamExternalWrapper } = require('@bot/wrappers/steamExternalWrapper.js');
const { Watcher } = require('./watcher.js');
const SourceType = require('@bot/constants/sourceType');

class SteamExternalWatcher extends Watcher {
    constructor() {
        if (isDev()) {
            super(timeConstants.TWO_HOURS);
        } else if (isProd()) {
            super(timeConstants.TWO_HOURS + timeConstants.THIRTY_MINUTES);
        }
        
        this.steamExternalWrapper = new SteamExternalWrapper();
    }

    async init() { }

    async fetchNews(source) {
        if (source[SourceType.STEAM_EXTERNAL]) {
            this.logger.debug(`Checking news for source ${JSON.stringify(source)}`);
            return await this.steamExternalWrapper.getNews(source[SourceType.STEAM_EXTERNAL]);
        }
    }

    async sendNews(news, gameName) {
        await this.messageUtil.sendSteamNewsToAllChannels(news, gameName);
    }
}

module.exports = { SteamExternalWatcher };