const timeConstants = require('../constants/timeConstants.js');
const { TwitterWrapper } = require('../wrappers/twitterWrapper.js');
const { Watcher } = require('./watcher');
const SourceType = require('../constants/sourceType');
const logger = require('../logger');

class TwitterWatcher extends Watcher {
    constructor() {
        super(timeConstants.ONE_HOUR);
        this.twitterWrapper = new TwitterWrapper();
    }

    async init() {
        await this.twitterWrapper.init();
    }

    async fetchNews(source) {
        if (source[SourceType.TWITTER]) {
            logger.debug(`Checking news for source ${JSON.stringify(source)}`);
            return await this.twitterWrapper.getTweets(source[SourceType.TWITTER]);
        }
    }

    async sendNews(news) {
        await this.messageUtil.sendTweetToAllChannels(news);
    }
}

module.exports = { TwitterWatcher };