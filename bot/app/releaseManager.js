const cron = require('node-cron');
const logger = require('./logger');
const MessageUtil = require('./messageUtil');
const DatabaseManager = require('./database');

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

    async startCronJobs() {
        const db = await DatabaseManager.getInstance();
        const games = await db.getGames();
        games.forEach(game => {
            try {
                this.addOrUpdateCronJob(game);
            } catch (error) {
                logger.error(`Failed to create cron job for ${game.name}: ${error.message}`);
            }
        });
    }

    addOrUpdateCronJob(game) {
        if (this.cronJobs[game.name]) {
            this.removeCronJob(game.name);
        }

        if (!game.releaseDate) {
            logger.debug(`Skipping cron job for ${game.name} - no release date set`);
            return;
        }

        try {
            this.cronJobs[game.name] = this.createCronJobFromGame(game);
            logger.info(`Added cron job for ${game.name} for date ${game.releaseDate}`);
        } catch (error) {
            logger.error(`Error creating cron job for ${game.name}: ${error.message}`);
            throw error;
        }
    }

    removeCronJob(gameName) {
        if (this.cronJobs[gameName]) {
            this.cronJobs[gameName].stop();
            delete this.cronJobs[gameName];
        }
    }

    createCronJobFromGame(game) {
        if (!game.releaseDate) {
            throw new Error('Game has no valid release date');
        }

        const [year, month, day] = game.releaseDate.split('-');
        const releaseDate = new Date(year, month - 1, day);

        if (isNaN(releaseDate.getTime())) {
            throw new Error(`Invalid release date format: ${game.releaseDate}`);
        }

        const releaseDateYear = parseInt(year);
        const cronTime = `0 0 ${day} ${month} *`;

        if (!cron.validate(cronTime)) {
            logger.error('Invalid cron expression', cronTime);
            throw new Error('Invalid cron expression');
        }

        return cron.schedule(cronTime, () => {
            const currentYear = new Date().getFullYear();
            if (releaseDateYear === currentYear) {
                this.sendMessage(game.name);
            } else {
                logger.warn(`Skipping message for ${game.name} as the release year ${releaseDateYear} is not the current year ${currentYear}`);
            }
        });
    }

    sendMessage(gameName) {
        logger.info(`Sending announcement for ${gameName}`);
        MessageUtil.sendGameReleaseToAllChannels(gameName);
    }
}

module.exports = ReleaseManager;