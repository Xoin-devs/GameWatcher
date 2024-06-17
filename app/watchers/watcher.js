const { readConfig, writeConfig } = require('../config');
const MessageUtil = require('../messageUtil');
const Utils = require('../utils');

class Watcher {
    constructor(checkInterval) {
        this.checkInterval = checkInterval;
        this.messageUtil = new MessageUtil();
    }

    async checkNewsForSources(sources, gameName) {
        for (let source of sources) {
            const latestNews = await this.fetchNews(source);
            if (latestNews) {
                const latestNewsDate = new Date(latestNews.date).getTime().toString();
                if (source.lastUpdate === latestNewsDate) {
                    continue;
                }

                console.log(`New news detected for game ${gameName}`);
                source.lastUpdate = latestNewsDate;

                try {
                    await this.sendNews(latestNews);
                } catch (error) {
                    console.error(error);
                }
            }
        }
    }

    async checkNews() {
        const config = readConfig();

        for (let game of config.games) {
            await this.checkNewsForSources(game.sources, game.name);
        }

        writeConfig(config);
    }

    async checkNewsForGame(gameName) {
        const config = readConfig();

        const game = config.games.find(g => Utils.normalizeName(g.name) === Utils.normalizeName(gameName));
        if (!game) {
            console.log(`Game ${gameName} not found.`);
            return;
        }

        await this.checkNewsForSources(game.sources, game.name);

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