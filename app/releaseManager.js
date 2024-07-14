const { readConfig } = require('./config');
const cron = require('node-cron');
const logger = require('./logger');
const MessageUtil = require('./messageUtil');

class ReleaseManager {
    constructor() {
        if (ReleaseManager.instance) {
            return ReleaseManager.instance;
        }

        this.cronJobs = {};
        ReleaseManager.instance = this;
    }

    static getInstance() {
        if (!ReleaseManager.instance) {
            ReleaseManager.instance = new ReleaseManager();
        }

        return ReleaseManager.instance;
    }

    startCronJobs() {
        const config = readConfig();
        config.games.forEach(game => {
            this.addOrUpdateCronJob(game);
        });
    }

    addOrUpdateCronJob(game) {
        if (this.cronJobs[game.name]) {
            this.removeCronJob(game.name);
        }

        if (game.releaseDate) {
            this.cronJobs[game.name] = this.createCronJobFromGame(game);
            logger.info(`Added cron job for ${game.name} for date ${game.releaseDate}`);
        }
    }

    removeCronJob(gameName) {
        if (this.cronJobs[gameName]) {
            this.cronJobs[gameName].stop();
            delete this.cronJobs[gameName];
        }
    }

    createCronJobFromGame(game) {
        const releaseDateYear = new Date(game.releaseDate).getFullYear();
        const cronTime = this.getCronTimebyDate(new Date(game.releaseDate));
        return cron.schedule(cronTime, () => {
            const currentYear = new Date().getFullYear();
            if (releaseDateYear === currentYear) {
                this.sendMessage(game.name);
            } else {
                logger.warn(`Skipping message for ${game.name} as the release year ${releaseDate.getFullYear()} is not the current year ${currentYear}`);
            }
        });
    }

    getCronTimebyDate(date) {
        if (isNaN(date.getTime())) {
            logger.error('Invalid date', date);
            throw new Error('Invalid date' + date);
        }

        const cronExpression = `0 0 ${date.getUTCDate()} ${date.getUTCMonth() + 1} *`;

        if (!cron.validate(cronExpression)) {
            logger.error('Invalid cron expression', cronExpression);
            throw new Error('Invalid cron expression');
        }

        logger.debug(`Cron time: ${cronExpression}`);
        return cronExpression;
    }

    sendMessage(gameName) {
        logger.info(`Sending announcement for ${gameName}`);
        MessageUtil.sendGameReleaseToAllChannels(gameName);
    }
}

module.exports = ReleaseManager;