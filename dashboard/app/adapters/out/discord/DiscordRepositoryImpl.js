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
     * @inheritdoc
     */
    async fetchGuildDetails(guildId, botToken) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'discord.com',
                path: `/api/v9/guilds/${guildId}`,
                method: 'GET',
                headers: {
                    Authorization: `Bot ${botToken}`
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
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'discord.com',
                path: '/api/v9/users/@me/guilds',
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`
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
                            // Transform to domain entities
                            const guildEntities = GuildMapper.toDomainList(parsedData);
                            resolve(guildEntities);
                        } catch (e) {
                            logger.error('Error parsing user guilds:', e.message);
                            reject(new ApplicationError('Error parsing user guilds'));
                        }
                    } else if (res.statusCode === 401) {
                        logger.error(`Unauthorized: ${data}`);
                        reject(new UnauthorizedError('Discord API authentication failed'));
                    } else {
                        logger.error(`Failed to fetch user guilds: ${res.statusCode} - ${data}`);
                        reject(new ApplicationError('Failed to fetch user guilds'));
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
}

module.exports = DiscordRepositoryImpl;