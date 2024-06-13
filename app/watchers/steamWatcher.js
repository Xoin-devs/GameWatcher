const { readConfig, writeConfig } = require('../config');
const SteamWrapper = require('../wrappers/steamWrapper');
const { TwitterWrapper, Browser, TweetParser } = require('../wrappers/twitterWrapper');
const MessageUtil = require('../messageUtil');
const timeConstants = require('../timeConstants');

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

class Watcher {
    constructor(checkInterval) {
        this.checkInterval = checkInterval;
        this.messageUtil = new MessageUtil();
    }

    async checkNews() {
        const config = readConfig();

        for (let game of config.games) {
            for (let source of game.sources) {
                const latestNews = await this.fetchNews(source);
                if (latestNews) {
                    const latestNewsDate = new Date(latestNews.date).getTime().toString();
                    if (source.lastUpdate === latestNewsDate) {
                        continue;
                    }

                    console.log(`New news detected for game ${game.name}`);
                    source.lastUpdate = latestNewsDate;
                    this.sendNews(latestNews);
                }
            }
        }

        writeConfig(config);
    }

    async fetchNews(source) {
        throw new Error('You have to implement the method fetchNews!');
    }

    async sendNews(news) {
        throw new Error('You have to implement the method sendNews!');
    }

    async init() {
        throw new Error('You have to implement the method init!');
    }
}

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
            const latestTweets = await this.twitterWrapper.getTweets(source.twitter);
            return latestTweets[0];
        }
    }

    async sendNews(news) {
        this.messageUtil.sendTweetToAllChannels(news);
    }
}

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
        this.messageUtil.sendSteamNewsToAllChannels(news);
    }
}

module.exports = { WatcherManager, TwitterWatcher, SteamWatcher };