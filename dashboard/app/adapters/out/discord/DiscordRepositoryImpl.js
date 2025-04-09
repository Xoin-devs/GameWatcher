const DiscordRepository = require('../../../core/domain/ports/out/DiscordRepository');
const GuildMapper = require('../persistence/GuildMapper');
const https = require('https');
const logger = require('@shared/logger');
const { ApplicationError, UnauthorizedError } = require('../../../core/application/errors/ApplicationErrors');

/**
 * Implementation of DiscordRepository that connects to the Discord API
 */
class DiscordRepositoryImpl extends DiscordRepository {
    /**
     * Constructor to initialize the repository
     */
    constructor() {
        super();
    }

    /**
     * @inheritdoc
     */
    async fetchGuildDetails(guildId, botToken) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'discord.com',
                path: `/api/v10/guilds/${guildId}`,
                method: 'GET',
                headers: {
                    Authorization: `Bot ${botToken}`,
                    'User-Agent': 'GameWatcher Dashboard (https://github.com/Xoin-devs/GameWatcher, v1.0.0)'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const parsedData = JSON.parse(data);
                            // Transform to domain entity
                            const guildEntity = GuildMapper.toDomain(parsedData);
                            resolve(guildEntity);
                        } catch (e) {
                            logger.error('Error parsing guild details:', e.message);
                            reject(new ApplicationError('Error parsing guild details'));
                        }
                    } else if (res.statusCode === 401) {
                        logger.error(`Unauthorized: ${data}`);
                        reject(new UnauthorizedError('Discord API authentication failed'));
                    } else {
                        logger.error(`Failed to fetch guild details: ${res.statusCode} - ${data}`);
                        reject(new ApplicationError('Failed to fetch guild details'));
                    }
                });
            });

            req.on('error', (e) => {
                logger.error('Request error:', e.message);
                reject(new ApplicationError(`Discord API request error: ${e.message}`));
            });

            req.setTimeout(10000, () => {
                req.destroy();
                reject(new ApplicationError('Discord API request timeout'));
            });

            req.end();
        });
    }

    /**
     * @inheritdoc
     */
    async fetchUserGuilds(accessToken) {
        // Implement retry logic with exponential backoff
        const maxRetries = 3;
        let retries = 0;
        
        // Helper function to delay execution
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        // Helper function to make the actual request
        const makeRequest = async () => {
            return new Promise((resolve, reject) => {
                // Enhanced logging for debugging
                logger.debug(`Fetching user guilds with token: ${accessToken ? accessToken.substring(0, 5) + '...' : 'undefined'} (Attempt ${retries + 1}/${maxRetries + 1})`);
                
                if (!accessToken) {
                    logger.error('Missing access token when fetching user guilds');
                    return reject(new UnauthorizedError('Missing Discord access token'));
                }
                
                const options = {
                    hostname: 'discord.com',
                    path: '/api/v10/users/@me/guilds', // Updated to v10 API
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'User-Agent': 'GameWatcher Dashboard (https://github.com/Xoin-devs/GameWatcher, v1.0.0)'
                    }
                };

                logger.debug(`Making request to Discord API: ${options.hostname}${options.path}`);
                
                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        logger.debug(`Discord API response status: ${res.statusCode}`);
                        
                        if (res.statusCode === 200) {
                            try {
                                const parsedData = JSON.parse(data);
                                logger.debug(`Successfully parsed guild data. Found ${parsedData.length} guilds`);
                                
                                // Transform to domain entities
                                const guildEntities = GuildMapper.toDomainList(parsedData);
                                resolve(guildEntities);
                            } catch (e) {
                                logger.error('Error parsing user guilds:', e.message);
                                logger.debug(`Raw data received: ${data.substring(0, 100)}...`);
                                reject(new ApplicationError('Error parsing user guilds'));
                            }
                        } else if (res.statusCode === 401) {
                            logger.error(`Unauthorized when fetching user guilds: ${data}`);
                            // Token may have expired - signal for potential refresh
                            reject(new UnauthorizedError('Discord authentication token expired or invalid'));
                        } else if (res.statusCode === 429) {
                            // Rate limiting - instead of rejecting, return the retry-after time
                            let retryAfterMs = (parseInt(res.headers['retry-after']) || 1) * 1000;
                            logger.warn(`Rate limited when fetching guilds. Will retry after ${retryAfterMs}ms`);
                            reject({ isRateLimit: true, retryAfterMs });
                        } else {
                            logger.error(`Failed to fetch user guilds: ${res.statusCode} - ${data}`);
                            reject(new ApplicationError(`Failed to fetch user guilds (HTTP ${res.statusCode})`));
                        }
                    });
                });

                req.on('error', (e) => {
                    logger.error('Network error while fetching user guilds:', e.message);
                    reject(new ApplicationError(`Discord API request error: ${e.message}`));
                });

                // Increase timeout to 15 seconds
                req.setTimeout(15000, () => {
                    req.destroy();
                    logger.error('Timeout occurred while fetching user guilds');
                    reject(new ApplicationError('Discord API request timed out. Please try again.'));
                });

                req.end();
            });
        };
        
        // Add an initial delay after login to avoid rate limiting
        await delay(1500); // Wait 1.5 seconds after login before first request
        
        // Main retry loop
        while (true) {
            try {
                return await makeRequest();
            } catch (error) {
                // If we got a rate limit error and still have retries left
                if (error.isRateLimit && retries < maxRetries) {
                    retries++;
                    logger.info(`Rate limit encountered. Retry attempt ${retries}/${maxRetries}`);
                    
                    // Wait for the specified time before retrying
                    await delay(error.retryAfterMs + 500); // Add a small buffer (500ms)
                    continue; // Try again
                }
                
                // If it's a rate limit but we're out of retries, or it's another error type
                if (error.isRateLimit) {
                    throw new ApplicationError(`Discord API rate limited. Maximum retries (${maxRetries}) exceeded.`);
                }
                
                // Pass through all other errors
                throw error;
            }
        }
    }
}

module.exports = DiscordRepositoryImpl;