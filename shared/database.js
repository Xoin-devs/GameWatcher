const mariadb = require('mariadb');
const logger = require('./logger');

class DatabaseManager {
    static instance = null;
    
    static async getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
            await DatabaseManager.instance.init();
        }
        return DatabaseManager.instance;
    }

    async init() {
        this.pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'mydatabase',
            waitForConnections: true,
            connectTimeout: 30000
        });

        logger.debug(`Connecting to database: ${process.env.DB_NAME || 'mydatabase'}`);
        logger.info('Connected to MariaDB');
        await this.createTables();
    }

    async createTables() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS guilds (
                id VARCHAR(255) PRIMARY KEY,
                channel_id VARCHAR(255) NOT NULL,
                webhook_url VARCHAR(255) NOT NULL
            );
        `);
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS games (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                release_date DATE NULL
            );
        `);
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS game_sources (
                game_id INT,
                type VARCHAR(50) NOT NULL,
                source_id VARCHAR(255) NOT NULL,
                last_update VARCHAR(50),
                FOREIGN KEY (game_id) REFERENCES games(id),
                PRIMARY KEY (game_id, type)
            );
        `);
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS guild_games (
                guild_id VARCHAR(255),
                game_id INT,
                FOREIGN KEY (guild_id) REFERENCES guilds(id),
                FOREIGN KEY (game_id) REFERENCES games(id),
                PRIMARY KEY (guild_id, game_id)
            );
        `);
    }

    async addGuild(guildId, channelId, webhookUrl) {
        await this.pool.query(
            'INSERT INTO guilds (id, channel_id, webhook_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), webhook_url = VALUES(webhook_url)',
            [guildId, channelId, webhookUrl]
        );
    }

    async removeGuildGames(guildId) {
        logger.debug(`Removing guild games associations for guild ID ${guildId}`);
        await this.pool.query('DELETE FROM guild_games WHERE guild_id = ?', [guildId]);
        logger.debug(`Successfully removed guild games for guild ID ${guildId}`);
    }

    async removeGuild(guildId) {
        logger.debug(`Removing guild ID ${guildId} from database`);
        await this.pool.query('DELETE FROM guilds WHERE id = ?', [guildId]);
        logger.info(`Successfully removed guild ID ${guildId}`);
    }
    
    async cleanupGuild(guildId) {
        logger.debug(`Starting full cleanup for guild ID ${guildId}`);
        await this.removeGuildGames(guildId);
        await this.removeGuild(guildId);
        logger.info(`Completed full cleanup for guild ID ${guildId}`);
    }

    async getGuilds() {
        return await this.pool.query('SELECT * FROM guilds');
    }

    async getGuildsForGame(gameName) {
        return await this.pool.query(`
            SELECT guilds.id, guilds.channel_id, guilds.webhook_url
            FROM guilds
            JOIN guild_games gg ON guilds.id = gg.guild_id
            JOIN games g ON gg.game_id = g.id
            WHERE g.name = ?
        `, [gameName]);
    }

    async addGame(name, sources = [], releaseDate = null) {
        if (releaseDate && !releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error(`Invalid date format: ${releaseDate}. Expected YYYY-MM-DD`);
        }
        const dateVal = releaseDate || null;
        const res = await this.pool.query(
            'INSERT INTO games (name, release_date) VALUES (?, ?)',
            [name, dateVal]
        );
        const gameId = res.insertId;
        
        for (const source of sources) {
            for (const [type, sourceId] of Object.entries(source)) {
                if (type === 'lastUpdate') continue;
                await this.pool.query(
                    'INSERT INTO game_sources (game_id, type, source_id, last_update) VALUES (?, ?, ?, ?)',
                    [gameId, type, sourceId, source.lastUpdate || null]
                );
            }
        }
        return gameId;
    }

    async updateGame(name, sources = [], releaseDate = null) {
        logger.debug('updateGame called with:', { name, sources, releaseDate });
        if (releaseDate && !releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error(`Invalid date format: ${releaseDate}. Expected YYYY-MM-DD`);
        }
        const rows = await this.pool.query('SELECT id FROM games WHERE name = ?', [name]);
        if (rows.length === 0) return false;
        const gameId = rows[0].id;
        
        logger.debug('Updating game:', { gameId });
        await this.pool.query(
            'UPDATE games SET release_date = ? WHERE id = ?',
            [releaseDate || null, gameId]
        );
        await this.pool.query('DELETE FROM game_sources WHERE game_id = ?', [gameId]);
        
        for (const source of sources) {
            for (const [type, sourceId] of Object.entries(source)) {
                if (type === 'lastUpdate') continue;
                await this.pool.query(
                    'INSERT INTO game_sources (game_id, type, source_id, last_update) VALUES (?, ?, ?, ?)',
                    [gameId, type, sourceId, source.lastUpdate || null]
                );
            }
        }
        logger.debug('New sources:', sources);
        return true;
    }

    async updateSourceLastUpdate(gameName, sourceType, sourceId, lastUpdate) {
        logger.debug(`Updating last update date for game '${gameName}', type '${sourceType}', id '${sourceId}', setting lastUpdate to '${lastUpdate}'`);

        const rows = await this.pool.query('SELECT id FROM games WHERE name = ?', [gameName]);
        if (rows.length === 0) return false;
        const gameId = rows[0].id;
    
        await this.pool.query(
            'UPDATE game_sources SET last_update = ? WHERE game_id = ? AND type = ? AND source_id = ?',
            [lastUpdate, gameId, sourceType, sourceId]
        );
        logger.info(`Successfully updated lastUpdate for game '${gameName}' - sourceType '${sourceType}', sourceId '${sourceId}' to '${lastUpdate}'`);
        return true;
    }

    async removeGame(name) {
        const rows = await this.pool.query('SELECT id FROM games WHERE name = ?', [name]);
        if (rows.length === 0) return false;
        const gameId = rows[0].id;
        
        await this.pool.query('DELETE FROM game_sources WHERE game_id = ?', [gameId]);
        await this.pool.query('DELETE FROM games WHERE id = ?', [gameId]);
        return true;
    }

    async getGames() {
        const games = await this.pool.query('SELECT * FROM games');
        const result = [];
        for (const game of games) {
            const sources = await this.pool.query(
                'SELECT type, source_id, last_update FROM game_sources WHERE game_id = ?',
                [game.id]
            );
            result.push({
                id: game.id,
                name: game.name,
                sources: sources.map(s => ({
                    [s.type]: s.source_id,
                    lastUpdate: s.last_update
                })),
                ...(game.release_date && { releaseDate: game.release_date })
            });
        }
        return result;
    }

    async getGame(name) {
        const rows = await this.pool.query('SELECT * FROM games WHERE name = ?', [name]);
        if (rows.length === 0) return null;
        const game = rows[0];
        const sources = await this.pool.query(
            'SELECT type, source_id, last_update FROM game_sources WHERE game_id = ?',
            [game.id]
        );
        return {
            name: game.name,
            sources: sources.map(s => ({
                [s.type]: s.source_id,
                lastUpdate: s.last_update
            })),
            ...(game.release_date && { releaseDate: game.release_date })
        };
    }

    async linkGameToGuild(guildId, gameId) {
        await this.pool.query(
            'INSERT INTO guild_games (guild_id, game_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE guild_id = guild_id',
            [guildId, gameId]
        );
    }

    async unlinkGameFromGuild(guildId, gameId) {
        await this.pool.query(
            'DELETE FROM guild_games WHERE guild_id = ? AND game_id = ?',
            [guildId, gameId]
        );
    }

    async getGuildGames(guildId) {
        const games = await this.pool.query(`
            SELECT g.id, g.name, g.release_date
            FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ?
        `, [guildId]);
        return games;
    }

    async getGuildGame(guildId, gameName) {
        const rows = await this.pool.query(`
            SELECT g.id, g.name, g.release_date
            FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ? AND g.name = ?
        `, [guildId, gameName]);
        if (rows.length === 0) return null;
        return rows[0];
    }

    async updateGuildWebhook(guildId, webhookUrl) {
        logger.debug(`Updating webhook URL for guild ID ${guildId}`);
        try {
            const result = await this.pool.query(
                'UPDATE guilds SET webhook_url = ? WHERE id = ?',
                [webhookUrl, guildId]
            );
            
            if (result.affectedRows === 0) {
                logger.warn(`Failed to update webhook URL for guild ID ${guildId}: Guild not found`);
                return false;
            }
            
            logger.info(`Successfully updated webhook URL for guild ID ${guildId}`);
            return true;
        } catch (error) {
            logger.error(`Error updating webhook URL for guild ID ${guildId}: ${error.message}`);
            return false;
        }
    }

    async getGuildWebhook(guildId) {
        const rows = await this.pool.query('SELECT webhook_url FROM guilds WHERE id = ?', [guildId]);
        if (rows.length === 0) return null;
        return rows[0].webhook_url;
    }

    async getGamesReleasingOn(date) {
        const rows = await this.pool.query('SELECT id, name, release_date FROM games WHERE release_date = ?', [date]);
        return rows.map(game => ({
            id: game.id,
            name: game.name,
            releaseDate: game.release_date
        }));
    }
    
    async getGamesWithMissingReleaseDate() {
        const games = await this.pool.query('SELECT id, name FROM games WHERE release_date IS NULL');
        const result = [];
        
        for (const game of games) {
            const sources = await this.pool.query(
                'SELECT type, source_id, last_update FROM game_sources WHERE game_id = ?',
                [game.id]
            );
            
            result.push({
                id: game.id,
                name: game.name,
                sources: sources.map(s => ({
                    [s.type]: s.source_id,
                    lastUpdate: s.last_update
                }))
            });
        }
        
        return result;
    }

    async updateGameReleaseDate(gameId, releaseDate) {
        if (releaseDate && !releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error(`Invalid date format: ${releaseDate}. Expected YYYY-MM-DD`);
        }
        
        await this.pool.query(
            'UPDATE games SET release_date = ? WHERE id = ?',
            [releaseDate, gameId]
        );
        
        logger.info(`Updated release date to ${releaseDate} for game ID ${gameId}`);
        return true;
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = DatabaseManager;