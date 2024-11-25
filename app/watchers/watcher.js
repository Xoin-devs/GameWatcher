const DatabaseManager = require('../database');
const MessageUtil = require('../messageUtil');
const Utils = require('../utils');
const logger = require('../logger');

class Watcher {
    constructor(checkInterval) {
        if (checkInterval <= 0) {
            logger.error('Check interval must be greater than 0');
            throw new Error('Check interval must be greater than 0');
        }

        this.checkInterval = checkInterval;
        this.messageUtil = new MessageUtil();
        this.logger = logger;
    }

    getCronExpression() {
        const time = Utils.msToTime(this.checkInterval);
        logger.debug(`Watcher configuration is ${time.days} days, ${time.hours} hours and ${time.minutes} minutes`);

        const day = time.days === 0 ? '*' : `*/${time.days}`;
        const hour = time.hours === 0 ? '*' : `*/${time.hours}`;

        const cronExpression = `${time.minutes} ${hour} ${day} * *`;
        if (!cron.validate(cronExpression)) {
            logger.error('Invalid cron expression', cronExpression);
            throw new Error('Invalid cron expression');
        }

        return cronExpression;
    }

    async checkNewsForSources(sources, gameName) {
        const db = await DatabaseManager.getInstance();
        
        for (const src of sources) {
            try {
                const latestNews = await this.fetchNews(src);
                if (latestNews && latestNews.length > 0) {
                    logger.debug(`Found ${latestNews.length} news for game ${gameName}`);

                    const latest = latestNews[0];
                    const latestDate = new Date(latest.date).getTime().toString();
                    if (src.lastUpdate === latestDate) {
                        logger.debug(`No recent news for game ${gameName}`);
                        continue;
                    }

                    logger.info(`Fresh news about ${gameName} has just been released`);
                    src.lastUpdate = latestDate;

                    try {
                        await this.sendNews(latest);
                        await db.updateGame(gameName, sources);
                    } catch (error) {
                        logger.error(`Error sending news for game ${gameName}`, error);
                    }
                }
            } catch (error) {
                logger.error(`Error fetching news for game ${gameName}`);
                logger.error(`Error: ${error.message}`);
            }
        }
    }

    async checkNews() {
        const db = await DatabaseManager.getInstance();
        const games = await db.getGames();

        for (let game of games) {
            await this.checkNewsForSources(game.sources, game.name);
        }
    }

    async checkNewsForGame(gameName) {
        const db = await DatabaseManager.getInstance();
        const game = await db.getGame(gameName);
        
        if (!game) {
            logger.error(`Game ${gameName} not found.`);
            return;
        }

        await this.checkNewsForSources(game.sources, game.name);
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