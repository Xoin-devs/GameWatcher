const cron = require('node-cron');
const logger = require('@shared/logger');
const MessageUtil = require('@bot/messageUtil');
const DatabaseManager = require('@shared/database');

class ReleaseManager {
    constructor() {
        if (ReleaseManager.instance) {
            return ReleaseManager.instance;
        }

        // Single daily cron job
        this.dailyCronJob = null;
        ReleaseManager.instance = this;
    }

    static getInstance() {
        if (!ReleaseManager.instance) {
            ReleaseManager.instance = new ReleaseManager();
        }

        return ReleaseManager.instance;
    }

    startCronJobs() {
        // Set up the daily check at midnight
        this.dailyCronJob = cron.schedule('0 0 * * *', () => {
            this.checkReleases();
        });
        
        logger.info('Release manager initialized with daily check');
        
        // Run a first check immediately on startup
        this.checkReleases();
    }
    
    async checkReleases() {
        try {
            // Check both today's releases and games releasing in 7 days
            await this.checkTodayReleases();
            await this.checkUpcomingReleases();
        } catch (error) {
            logger.error(`Error during release checks: ${error.message}`);
        }
    }

    async checkTodayReleases() {
        try {
            const today = new Date();
            const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
            
            const db = await DatabaseManager.getInstance();
            const games = await db.getGamesReleasingOn(formattedDate);
            
            if (games.length > 0) {
                logger.info(`Found ${games.length} games releasing today (${formattedDate})`);
                
                games.forEach(game => {
                    this.sendReleaseMessage(game);
                });
            } else {
                logger.debug(`No games releasing today (${formattedDate})`);
            }
        } catch (error) {
            logger.error(`Error checking today's releases: ${error.message}`);
        }
    }

    async checkUpcomingReleases() {
        try {
            const today = new Date();
            const upcomingDate = new Date(today);
            upcomingDate.setDate(today.getDate() + 7);
            
            const formattedDate = `${upcomingDate.getFullYear()}-${(upcomingDate.getMonth() + 1).toString().padStart(2, '0')}-${upcomingDate.getDate().toString().padStart(2, '0')}`;
            
            const db = await DatabaseManager.getInstance();
            const games = await db.getGamesReleasingOn(formattedDate);
            
            if (games.length > 0) {
                logger.info(`Found ${games.length} games releasing in 7 days (${formattedDate})`);
                
                games.forEach(game => {
                    this.sendTeaseMessage(game);
                });
            } else {
                logger.debug(`No games releasing in 7 days (${formattedDate})`);
            }
        } catch (error) {
            logger.error(`Error checking upcoming releases: ${error.message}`);
        }
    }

    // This method is kept for compatibility with existing code
    addOrUpdateCronJob(game) {
        // No longer needed to track games in memory
        // If game is releasing today or in 7 days, handle it now
        if (!game.releaseDate) {
            logger.debug(`Added game ${game.name} has no release date set`);
            return;
        }
        
        this.checkGameRelease(game);
    }
    
    async checkGameRelease(game) {
        try {
            const today = new Date();
            const formattedToday = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
            
            // Check if releasing today
            if (game.releaseDate === formattedToday) {
                logger.info(`Game ${game.name} is releasing today! Sending announcement.`);
                this.sendReleaseMessage(game);
                return;
            }
            
            // Check if releasing in 7 days
            const upcomingDate = new Date(today);
            upcomingDate.setDate(today.getDate() + 7);
            const formattedUpcoming = `${upcomingDate.getFullYear()}-${(upcomingDate.getMonth() + 1).toString().padStart(2, '0')}-${upcomingDate.getDate().toString().padStart(2, '0')}`;
            
            if (game.releaseDate === formattedUpcoming) {
                logger.info(`Game ${game.name} is releasing in 7 days! Sending teaser.`);
                this.sendTeaseMessage(game);
            }
        } catch (error) {
            logger.error(`Error checking release for ${game.name}: ${error.message}`);
        }
    }

    sendReleaseMessage(game) {
        logger.info(`Sending release announcement for ${game.name}`);
        MessageUtil.sendGameReleaseToAllGuilds(game);
    }
    
    sendTeaseMessage(game) {
        logger.info(`Sending release teaser for ${game.name}`);
        MessageUtil.sendGameReleaseTeaseToAllGuilds(game);
    }
    
    stop() {
        if (this.dailyCronJob) {
            this.dailyCronJob.stop();
        }
        logger.info('Release manager stopped');
    }
}

module.exports = ReleaseManager;