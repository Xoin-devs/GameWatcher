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
            connectTimeout: 30000,
            // Add BigInt support configuration
            supportBigNumbers: true,
            bigNumberStrings: true,
            // Ensure all numeric values are returned as strings to avoid BigInt issues
            typeCast: function (field, next) {
                if (field.type === 'BIGINT') {
                    return field.string();
                }
                return next();
            }
        });

        logger.debug(`Connecting to database: ${process.env.DB_NAME || 'mydatabase'}`);
        logger.info('Connected to MariaDB');
        await this.createTables();
    }

    async createTables() {
        // Modify guild_id to explicitly use VARCHAR(255) to handle Discord snowflakes as strings
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

    // Helper function to validate date format
    _validateDateFormat(releaseDate) {
        if (releaseDate && !releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error(`Invalid date format: ${releaseDate}. Expected YYYY-MM-DD`);
        }
        return releaseDate || null;
    }

    // Helper function to ensure guild IDs are strings
    _ensureString(id) {
        return String(id);
    }

    // Guild methods
    async addGuild(guildId, channelId, webhookUrl) {
        guildId = this._ensureString(guildId);
        await this.pool.query(
            'INSERT INTO guilds (id, channel_id, webhook_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), webhook_url = VALUES(webhook_url)',
            [guildId, channelId, webhookUrl]
        );
    }

    async removeGuildGames(guildId) {
        guildId = this._ensureString(guildId);
        logger.debug(`Removing guild games associations for guild ID ${guildId}`);
        await this.pool.query('DELETE FROM guild_games WHERE guild_id = ?', [guildId]);
        logger.debug(`Successfully removed guild games for guild ID ${guildId}`);
    }

    async removeGuild(guildId) {
        guildId = this._ensureString(guildId);
        logger.debug(`Removing guild ID ${guildId} from database`);
        await this.pool.query('DELETE FROM guilds WHERE id = ?', [guildId]);
        logger.info(`Successfully removed guild ID ${guildId}`);
    }
    
    async cleanupGuild(guildId) {
        guildId = this._ensureString(guildId);
        logger.debug(`Starting full cleanup for guild ID ${guildId}`);
        await this.removeGuildGames(guildId);
        await this.removeGuild(guildId);
        logger.info(`Completed full cleanup for guild ID ${guildId}`);
    }

    async getGuilds() {
        return await this.pool.query('SELECT * FROM guilds');
    }

    async getGuild(guildId) {
        guildId = this._ensureString(guildId);
        
        try {
            const rows = await this.pool.query('SELECT * FROM guilds WHERE id = ?', [guildId]);
            if (rows.length === 0) return null;
            return rows[0];
        } catch (error) {
            logger.error(`Error getting guild ${guildId}: ${error.message}`);
            throw error;
        }
    }

    // Alias for getGuild - kept for compatibility
    async getGuildById(guildId) {
        return this.getGuild(guildId);
    }

    async updateGuildWebhook(guildId, webhookUrl) {
        guildId = this._ensureString(guildId);
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

    // Game methods
    async addGame(name, sources = [], releaseDate = null) {
        const dateVal = this._validateDateFormat(releaseDate);
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
        const dateVal = this._validateDateFormat(releaseDate);
        
        const rows = await this.pool.query('SELECT id FROM games WHERE name = ?', [name]);
        if (rows.length === 0) return false;
        const gameId = rows[0].id;
        
        logger.debug('Updating game:', { gameId });
        await this.pool.query(
            'UPDATE games SET release_date = ? WHERE id = ?',
            [dateVal, gameId]
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

    async updateGameReleaseDate(gameId, releaseDate) {
        const dateVal = this._validateDateFormat(releaseDate);
        
        await this.pool.query(
            'UPDATE games SET release_date = ? WHERE id = ?',
            [dateVal, gameId]
        );
        
        logger.info(`Updated release date to ${releaseDate} for game ID ${gameId}`);
        return true;
    }

    // Guild-Game relationship methods
    async linkGameToGuild(guildId, gameId) {
        guildId = this._ensureString(guildId);
        await this.pool.query(
            'INSERT INTO guild_games (guild_id, game_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE guild_id = guild_id',
            [guildId, gameId]
        );
    }

    async unlinkGameFromGuild(guildId, gameId) {
        guildId = this._ensureString(guildId);
        await this.pool.query(
            'DELETE FROM guild_games WHERE guild_id = ? AND game_id = ?',
            [guildId, gameId]
        );
    }

    async isGameSubscribed(guildId, gameId) {
        guildId = this._ensureString(guildId);
        
        try {
            const result = await this.pool.query(
                'SELECT 1 FROM guild_games WHERE guild_id = ? AND game_id = ?',
                [guildId, gameId]
            );
            
            return result.length > 0;
        } catch (error) {
            logger.error(`Error checking if game ${gameId} is subscribed for guild ${guildId}: ${error.message}`);
            throw error;
        }
    }

    async getGuildGames(guildId) {
        guildId = this._ensureString(guildId);
        const games = await this.pool.query(`
            SELECT g.id, g.name, g.release_date
            FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ?
        `, [guildId]);
        return games;
    }

    async getGuildGame(guildId, gameName) {
        guildId = this._ensureString(guildId);
        const rows = await this.pool.query(`
            SELECT g.id, g.name, g.release_date
            FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ? AND g.name = ?
        `, [guildId, gameName]);
        if (rows.length === 0) return null;
        return rows[0];
    }

    async getGuildGameStats(guildId) {
        guildId = this._ensureString(guildId);
        
        try {
            // Count total games in system
            const totalGamesResult = await this.pool.query(
                'SELECT COUNT(*) as total FROM games'
            );
            
            // Count subscribed games for the guild
            const subscribedGamesResult = await this.pool.query(
                'SELECT COUNT(*) as total FROM guild_games WHERE guild_id = ?',
                [guildId]
            );
            
            return {
                totalGames: totalGamesResult[0].total,
                subscribedGames: subscribedGamesResult[0].total
            };
        } catch (error) {
            logger.error(`Error getting game stats for guild ${guildId}: ${error.message}`);
            throw error;
        }
    }

    // Guild-Game queries with pagination
    async getPaginatedGuildGames(guildId, page = 1, limit = 20, search = '', filterSubscribed = '') {
        guildId = this._ensureString(guildId);
        logger.debug(`getPaginatedGuildGames called with guildId: ${guildId} (type: ${typeof guildId})`);
        
        const offset = (page - 1) * limit;
        let baseQuery = `
            SELECT g.id, g.name, g.release_date, 
                   CASE WHEN gg.guild_id IS NOT NULL THEN 1 ELSE 0 END as subscribed
            FROM games g
            LEFT JOIN guild_games gg ON g.id = gg.game_id AND gg.guild_id = ?
        `;
        
        let countQuery = `
            SELECT COUNT(*) as total
            FROM games g
            LEFT JOIN guild_games gg ON g.id = gg.game_id AND gg.guild_id = ?
        `;
        
        let params = [guildId];
        logger.debug(`SQL params: ${JSON.stringify(params)}`);
        
        // Add search condition if provided
        if (search) {
            baseQuery += ' WHERE g.name LIKE ?';
            countQuery += ' WHERE g.name LIKE ?';
            params.push(`%${search}%`);
        }
        
        // Add subscription filter if provided
        if (filterSubscribed === 'subscribed' || filterSubscribed === 'unsubscribed') {
            const whereClause = search ? ' AND' : ' WHERE';
            const isSubscribed = filterSubscribed === 'subscribed' ? 'IS NOT NULL' : 'IS NULL';
            baseQuery += `${whereClause} gg.guild_id ${isSubscribed}`;
            countQuery += `${whereClause} gg.guild_id ${isSubscribed}`;
        }
        
        // Add pagination
        baseQuery += ' ORDER BY g.name LIMIT ? OFFSET ?';
        params.push(parseInt(limit, 10), parseInt(offset, 10));
        
        try {
            // Get total count for pagination
            const countParams = [guildId];
            if (search) countParams.push(`%${search}%`);
            logger.debug(`Count SQL params: ${JSON.stringify(countParams)}`);
            const countResult = await this.pool.query(countQuery, countParams);
            const totalGames = countResult[0].total;
            
            // Get paginated games
            logger.debug(`Final SQL params: ${JSON.stringify(params)}`);
            const games = await this.pool.query(baseQuery, params);
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
                    subscribed: game.subscribed === 1,
                    ...(game.release_date && { releaseDate: game.release_date })
                });
            }
            
            return {
                games: result,
                pagination: {
                    total: totalGames,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages: Math.ceil(totalGames / limit)
                }
            };
        } catch (error) {
            logger.error(`Error in getPaginatedGuildGames for guildId ${guildId}:`, error.message);
            throw error;
        }
    }

    // Game release methods
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

    // Game queries
    async getGuildsForGame(gameName) {
        return await this.pool.query(`
            SELECT guilds.id, guilds.channel_id, guilds.webhook_url
            FROM guilds
            JOIN guild_games gg ON guilds.id = gg.guild_id
            JOIN games g ON gg.game_id = g.id
            WHERE g.name = ?
        `, [gameName]);
    }

    // Cleanup
    async close() {
        await this.pool.end();
    }
}

module.exports = DatabaseManager;