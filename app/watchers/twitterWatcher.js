const timeConstants = require('../constants/timeConstants.js');
const { Browser, TweetParser, TwitterWrapper } = require('../wrappers/twitterWrapper.js');
const { Watcher } = require('./watcher');

class TwitterWatcher extends Watcher {
    constructor() {
        super(timeConstants.ONE_HOUR);
        this.twitterWrapper = new TwitterWrapper(new Browser(), new TweetParser());
    }

    async init() {
        await this.twitterWrapper.browser.init();
    }

    async fetchNews(source) {
        if (source.twitter) {
            return await this.twitterWrapper.getTweets(source.twitter);
        }
    }

    async sendNews(news) {
        await this.messageUtil.sendTweetToAllChannels(news);
    }
}

module.exports = { TwitterWatcher };