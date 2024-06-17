const { readConfig, writeConfig } = require('../config');
const MessageUtil = require('../messageUtil');
const Utils = require('../utils');
const logger = require('../logger');

class Watcher {
    constructor(checkInterval) {
        this.checkInterval = checkInterval;
        this.messageUtil = new MessageUtil();
    }

    async checkNewsForSources(sources, gameName) {
        for (let src of sources) {
            const latestNews = await this.fetchNews(src);
            if (latestNews && latestNews.length > 0) {
                const latest = latestNews[0];
                const latestDate = new Date(latest.date).getTime().toString();
                if (src.lastUpdate === latestDate) {
                    continue;
                }

                logger.info(`Fresh news about ${gameName} has just been released`);
                src.lastUpdate = latestDate;

                try {
                    await this.sendNews(latest);
                } catch (error) {
                    logger.error(`Error sending news for game ${gameName}`);
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
            logger.error(`Game ${gameName} not found.`);
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