const { isDev, isProd } = require('../../../shared/config');
const timeConstants = require('../constants/timeConstants.js');
const { TwitterWrapper } = require('../wrappers/twitterWrapper.js');
const { Watcher } = require('./watcher');
const SourceType = require('../constants/sourceType');

class TwitterWatcher extends Watcher {
    constructor() {
        if (isDev()) {
            super(timeConstants.TWO_HOURS);
        } else if (isProd()) {
            super(timeConstants.ONE_HOUR);
        }
        this.twitterWrapper = new TwitterWrapper();
    }

    async init() {
        await this.twitterWrapper.init();
    }

    async fetchNews(source) {
        if (source[SourceType.TWITTER]) {
            this.logger.debug(`Checking news for source ${JSON.stringify(source)}`);
            return await this.twitterWrapper.getTweets(source[SourceType.TWITTER]);
        }
    }

    async sendNews(news, gameName) {
        await this.messageUtil.sendTweetToAllChannels(news, gameName);
    }
}

module.exports = { TwitterWatcher };