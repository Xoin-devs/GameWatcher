const cron = require('node-cron');
const logger = require('@shared/logger');
const MessageUtil = require('@bot/messageUtil');
const DatabaseManager = require('@shared/database');
const { getSteamGameData, parseDate, formatHumanReadableDate } = require('@bot/utils');

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
        
        this.checkReleases();
    }
    
    async checkReleases() {
        try {
            await this.checkChangedReleaseDates();
            await this.getMissingReleaseDates();
            await this.checkTodayReleases();
            await this.checkUpcomingReleases();
        } catch (error) {
            logger.error(`Error during release checks: ${error.message}`);
        }
    }

    async checkChangedReleaseDates() {
        try {
            logger.info('Checking for games with changed release dates');
            const db = await DatabaseManager.getInstance();
            const upcomingGames = await db.getUpcomingGames();
            
            if (upcomingGames.length === 0) {
                logger.info('No upcoming games found to check for date changes');
                return;
            }
            
            logger.debug(`Checking ${upcomingGames.length} upcoming games for potential date changes`);
            
            for (const game of upcomingGames) {
                let steamAppId = null;
                
                // Skip games without a release date
                if (!game.releaseDate) {
                    continue;
                }
                
                // Extract Steam AppID if available
                if (game.sources && game.sources.length > 0) {
                    for (const source of game.sources) {
                        if (source.steam_internal) {
                            steamAppId = source.steam_internal;
                            break;
                        }
                    }
                }
                
                if (!steamAppId) {
                    logger.debug(`Game ${game.name} has no Steam AppID, skipping date change check`);
                    continue;
                }
                  try {
                    logger.debug(`Checking current release date for ${game.name} (AppID: ${steamAppId})`);
                    const steamData = await getSteamGameData(steamAppId);
                    
                    if (!steamData || !steamData.releaseDate) {
                        logger.debug(`No release date found for ${game.name}`);
                        continue;
                    }
                    
                    // Get the formatted date from the steamData object
                    const formattedCurrentDate = steamData.formattedReleaseDate;
                    
                    // Parse both dates to ensure we're comparing them properly
                    // Using parseDate from utils which normalizes dates to YYYY-MM-DD format
                    const storedDateObj = new Date(parseDate(game.releaseDate) + 'T00:00:00Z');
                    const currentDateObj = new Date(parseDate(formattedCurrentDate) + 'T00:00:00Z');
                    
                    // Compare timestamps to check if the dates are actually different
                    if (storedDateObj.getTime() !== currentDateObj.getTime()) {
                        const dateChanged = currentDateObj > storedDateObj ? 'moved back' : 'moved forward';
                        
                        // Format dates for display using formatHumanReadableDate from Utils
                        const readableOldDate = formatHumanReadableDate(game.releaseDate);
                        const readableNewDate = formatHumanReadableDate(formattedCurrentDate);
                        
                        logger.info(`Game "${game.name}" release date has ${dateChanged} from ${readableOldDate} to ${readableNewDate}`);
                        
                        // Update the release date in the database
                        await db.updateGameReleaseDate(game.id, formattedCurrentDate);
                        
                        // Send date change notification
                        this.sendDateChangeMessage(game, readableOldDate, readableNewDate);
                    }
                } catch (error) {
                    logger.error(`Error checking date changes for ${game.name}: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Error checking for release date changes: ${error.message}`);
        }
    }

    async getMissingReleaseDates() {
        try {
            logger.info('Checking for games with missing release dates');
            const db = await DatabaseManager.getInstance();
            const gamesWithMissingDates = await db.getGamesWithMissingReleaseDate();
            
            if (gamesWithMissingDates.length === 0) {
                logger.info('No games with missing release dates found');
                return;
            }
            
            logger.debug(`Found ${gamesWithMissingDates.length} games with missing release dates`);
            
            for (const game of gamesWithMissingDates) {
                let steamAppId = null;
                
                if (game.sources && game.sources.length > 0) {
                    for (const source of game.sources) {
                        if (source.steam_internal) {
                            steamAppId = source.steam_internal;
                            break;
                        }
                    }
                }
                
                if (!steamAppId) {
                    logger.debug(`Game ${game.name} has no Steam AppID, skipping release date lookup`);
                    continue;
                }
                  try {
                    logger.debug(`Fetching release date for ${game.name} (AppID: ${steamAppId})`);
                    const steamData = await getSteamGameData(steamAppId);
                    
                    if (steamData && steamData.formattedReleaseDate) {
                        logger.info(`Found release date for ${game.name}: ${steamData.releaseDate}`);
                        logger.debug(`Updating release date for ${game.name} to ${steamData.formattedReleaseDate}`);
                        await db.updateGameReleaseDate(game.id, steamData.formattedReleaseDate);
                    } else {
                        logger.debug(`No release date found for ${game.name}`);
                    }
                } catch (error) {
                    logger.error(`Error fetching release date for ${game.name}: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Error getting missing release dates: ${error.message}`);
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

    addOrUpdateCronJob(game) {
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
    
    // Add a new method to send date change messages
    sendDateChangeMessage(game, oldDate, newDate) {
        logger.info(`Sending release date change notification for ${game.name} (${oldDate} → ${newDate})`);
        MessageUtil.sendGameDateChangeToAllGuilds(game, oldDate, newDate);
    }

    stop() {
        if (this.dailyCronJob) {
            this.dailyCronJob.stop();
        }
        logger.info('Release manager stopped');
    }
}

module.exports = ReleaseManager;