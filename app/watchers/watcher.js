const { readConfig, writeConfig } = require('../config');
const MessageUtil = require('../messageUtil');

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

module.exports = { Watcher };