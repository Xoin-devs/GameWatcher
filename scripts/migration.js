const dotenv = require('dotenv');
const path = require('path');
const DatabaseManager = require('../app/database');
const { readConfig } = require('../app/config');
const logger = require('../app/logger');

function convertDateToISO(timestamp) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        logger.warn(`Invalid timestamp encountered: ${timestamp}`);
        return null;
    }
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

async function migrateData() {
    const env = process.env.NODE_ENV || 'dev';
    dotenv.config({ path: path.join(__dirname, '..', `.env.${env}`) });

    try {
        logger.info(`Starting database migration for ${env} environment...`);
        const db = await DatabaseManager.getInstance();
        const config = readConfig();

        // Migrate guilds
        logger.info('Migrating guilds...');
        for (const guild of config.guilds) {
            await db.addGuild(guild.guildId, guild.channelId);
        }

        // Migrate games
        logger.info('Migrating games...');
        for (const game of config.games) {
            const releaseDate = convertDateToISO(game.releaseDate);
            logger.debug(`Converting date for ${game.name}: ${game.releaseDate} -> ${releaseDate}`);
            
            try {
                await db.addGame(
                    game.name,
                    game.sources,
                    releaseDate
                );
            } catch (error) {
                if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed: games.name')) {
                    logger.warn(`Game ${game.name} already exists. Updating existing record.`);
                    await db.updateGame(
                        game.name,
                        game.sources,
                        releaseDate
                    );
                } else {
                    logger.error(`Failed to migrate game ${game.name}:`, error);
                }
            }
        }

        logger.info('Migration completed successfully!');
        await db.close();
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateData();