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
        // Use more explicit connection configuration with connection pooling
        this.pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'mydatabase',
            waitForConnections: true,
            connectionLimit: 10, // Add connection pool limit for better resource management
            queueLimit: 0, // Unlimited queue
            connectTimeout: 30000,
            acquireTimeout: 30000, // Timeout for acquiring a connection from pool
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
        
        try {
            // Test connection on startup
            const conn = await this.pool.getConnection();
            await conn.ping();
            conn.release();
            logger.info('Connected to MariaDB successfully');
            await this.createTables();
        } catch (err) {
            logger.error(`Database connection error: ${err.message}`);
            throw err; // Re-throw to allow app to handle startup failure
        }
    }

    async createTables() {
        // Add indexes for performance and explicit NOT NULL constraints where appropriate
        const queries = [
            // Guilds table
            `CREATE TABLE IF NOT EXISTS guilds (
                id VARCHAR(255) PRIMARY KEY,
                channel_id VARCHAR(255) NOT NULL,
                webhook_url VARCHAR(255) NOT NULL
            );`,
            
            // Games table
            `CREATE TABLE IF NOT EXISTS games (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                release_date DATE NULL,
                INDEX (release_date)
            );`,
            
            // Game sources table
            `CREATE TABLE IF NOT EXISTS game_sources (
                game_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                source_id VARCHAR(255) NOT NULL,
                last_update VARCHAR(50) NULL,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                PRIMARY KEY (game_id, type)
            );`,
            
            // Guild games table
            `CREATE TABLE IF NOT EXISTS guild_games (
                guild_id VARCHAR(255) NOT NULL,
                game_id INT NOT NULL,
                FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                PRIMARY KEY (guild_id, game_id)
            );`,
            
            // Sessions table for express-session
            `CREATE TABLE IF NOT EXISTS sessions (
                session_id VARCHAR(128) PRIMARY KEY,
                expires BIGINT NOT NULL,
                data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX (expires)
            );`
        ];
        
        for (const query of queries) {
            await this.pool.query(query);
        }
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
        return id === null || id === undefined ? null : String(id);
    }

    // Helper function to safely execute queries with error handling
    async _safeQuery(query, params = [], errorMessage = 'Database query error') {
        try {
            return await this.pool.query(query, params);
        } catch (error) {
            logger.error(`${errorMessage}: ${error.message}`);
            throw error;
        }
    }

    // Guild methods
    async addGuild(guildId, channelId, webhookUrl) {
        guildId = this._ensureString(guildId);
        return await this._safeQuery(
            'INSERT INTO guilds (id, channel_id, webhook_url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id), webhook_url = VALUES(webhook_url)',
            [guildId, channelId, webhookUrl],
            `Error adding guild ${guildId}`
        );
    }

    async removeGuildGames(guildId) {
        guildId = this._ensureString(guildId);
        logger.debug(`Removing guild games associations for guild ID ${guildId}`);
        await this._safeQuery(
            'DELETE FROM guild_games WHERE guild_id = ?',
            [guildId],
            `Error removing games for guild ${guildId}`
        );
        logger.debug(`Successfully removed guild games for guild ID ${guildId}`);
    }

    async removeGuild(guildId) {
        guildId = this._ensureString(guildId);
        logger.debug(`Removing guild ID ${guildId} from database`);
        await this._safeQuery(
            'DELETE FROM guilds WHERE id = ?',
            [guildId],
            `Error removing guild ${guildId}`
        );
        logger.info(`Successfully removed guild ID ${guildId}`);
    }
    
    async cleanupGuild(guildId) {
        guildId = this._ensureString(guildId);
        logger.debug(`Starting full cleanup for guild ID ${guildId}`);
        
        // Use a transaction to ensure atomicity
        let conn;
        try {
            conn = await this.pool.getConnection();
            await conn.beginTransaction();
            
            await conn.query('DELETE FROM guild_games WHERE guild_id = ?', [guildId]);
            await conn.query('DELETE FROM guilds WHERE id = ?', [guildId]);
            
            await conn.commit();
            logger.info(`Completed full cleanup for guild ID ${guildId}`);
        } catch (error) {
            if (conn) await conn.rollback();
            logger.error(`Error during guild cleanup for ${guildId}: ${error.message}`);
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }

    async getGuilds() {
        return await this._safeQuery(
            'SELECT * FROM guilds',
            [],
            'Error fetching guilds'
        );
    }

    async getGuild(guildId) {
        guildId = this._ensureString(guildId);
        
        try {
            const rows = await this._safeQuery(
                'SELECT * FROM guilds WHERE id = ?',
                [guildId],
                `Error getting guild ${guildId}`
            );
            return rows.length === 0 ? null : rows[0];
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
            const result = await this._safeQuery(
                'UPDATE guilds SET webhook_url = ? WHERE id = ?',
                [webhookUrl, guildId],
                `Error updating webhook for guild ${guildId}`
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
        
        // Use a transaction to ensure atomicity
        let conn;
        try {
            conn = await this.pool.getConnection();
            await conn.beginTransaction();
            
            const res = await conn.query(
                'INSERT INTO games (name, release_date) VALUES (?, ?)',
                [name, dateVal]
            );
            const gameId = res.insertId;
            
            for (const source of sources) {
                for (const [type, sourceId] of Object.entries(source)) {
                    if (type === 'lastUpdate') continue;
                    await conn.query(
                        'INSERT INTO game_sources (game_id, type, source_id, last_update) VALUES (?, ?, ?, ?)',
                        [gameId, type, sourceId, source.lastUpdate || null]
                    );
                }
            }
            
            await conn.commit();
            return gameId;
        } catch (error) {
            if (conn) await conn.rollback();
            logger.error(`Error adding game ${name}: ${error.message}`);
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }

    async updateGame(name, sources = [], releaseDate = null) {
        logger.debug('updateGame called with:', { name, sources, releaseDate });
        const dateVal = this._validateDateFormat(releaseDate);
        
        // Find the game first
        const rows = await this._safeQuery(
            'SELECT id FROM games WHERE name = ?',
            [name],
            `Error finding game ${name}`
        );
        
        if (rows.length === 0) return false;
        const gameId = rows[0].id;
        
        // Use a transaction to ensure atomicity
        let conn;
        try {
            conn = await this.pool.getConnection();
            await conn.beginTransaction();
            
            logger.debug('Updating game:', { gameId });
            await conn.query(
                'UPDATE games SET release_date = ? WHERE id = ?',
                [dateVal, gameId]
            );
            
            // Delete and re-insert sources
            await conn.query('DELETE FROM game_sources WHERE game_id = ?', [gameId]);
            
            for (const source of sources) {
                for (const [type, sourceId] of Object.entries(source)) {
                    if (type === 'lastUpdate') continue;
                    await conn.query(
                        'INSERT INTO game_sources (game_id, type, source_id, last_update) VALUES (?, ?, ?, ?)',
                        [gameId, type, sourceId, source.lastUpdate || null]
                    );
                }
            }
            
            await conn.commit();
            logger.debug('New sources:', sources);
            return true;
        } catch (error) {
            if (conn) await conn.rollback();
            logger.error(`Error updating game ${name}: ${error.message}`);
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }

    async updateSourceLastUpdate(gameName, sourceType, sourceId, lastUpdate) {
        logger.debug(`Updating last update date for game '${gameName}', type '${sourceType}', id '${sourceId}', setting lastUpdate to '${lastUpdate}'`);

        const rows = await this._safeQuery(
            'SELECT id FROM games WHERE name = ?',
            [gameName],
            `Error finding game ${gameName}`
        );
        
        if (rows.length === 0) return false;
        const gameId = rows[0].id;
    
        await this._safeQuery(
            'UPDATE game_sources SET last_update = ? WHERE game_id = ? AND type = ? AND source_id = ?',
            [lastUpdate, gameId, sourceType, sourceId],
            `Error updating last update for game ${gameName}`
        );
        
        logger.info(`Successfully updated lastUpdate for game '${gameName}' - sourceType '${sourceType}', sourceId '${sourceId}' to '${lastUpdate}'`);
        return true;
    }

    async removeGame(name) {
        const rows = await this._safeQuery(
            'SELECT id FROM games WHERE name = ?',
            [name],
            `Error finding game ${name}`
        );
        
        if (rows.length === 0) return false;
        const gameId = rows[0].id;
        
        // With ON DELETE CASCADE in the foreign keys, we only need to delete the game
        await this._safeQuery(
            'DELETE FROM games WHERE id = ?',
            [gameId],
            `Error removing game ${name}`
        );
        
        return true;
    }

    async getGames() {
        // Optimize by using a JOIN query to reduce database calls
        const gamesResult = await this._safeQuery(`
            SELECT g.id, g.name, g.release_date, gs.type, gs.source_id, gs.last_update 
            FROM games g
            LEFT JOIN game_sources gs ON g.id = gs.game_id
            ORDER BY g.name
        `, [], 'Error fetching games');
        
        // Process the results
        const gamesMap = new Map();
        
        for (const row of gamesResult) {
            if (!gamesMap.has(row.id)) {
                gamesMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    sources: [],
                    ...(row.release_date && { releaseDate: row.release_date })
                });
            }
            
            const game = gamesMap.get(row.id);
            
            // Only add sources if they exist
            if (row.type && row.source_id) {
                game.sources.push({
                    [row.type]: row.source_id,
                    lastUpdate: row.last_update
                });
            }
        }
        
        return Array.from(gamesMap.values());
    }

    async getGame(name) {
        // Optimize by using a JOIN query to reduce database calls
        const gameResult = await this._safeQuery(`
            SELECT g.id, g.name, g.release_date, gs.type, gs.source_id, gs.last_update
            FROM games g
            LEFT JOIN game_sources gs ON g.id = gs.game_id
            WHERE g.name = ?
        `, [name], `Error fetching game ${name}`);
        
        if (gameResult.length === 0) return null;
        
        // Process the result
        const sources = [];
        for (const row of gameResult) {
            if (row.type && row.source_id) {
                sources.push({
                    [row.type]: row.source_id,
                    lastUpdate: row.last_update
                });
            }
        }
        
        return {
            name: gameResult[0].name,
            sources: sources,
            ...(gameResult[0].release_date && { releaseDate: gameResult[0].release_date })
        };
    }

    async updateGameReleaseDate(gameId, releaseDate) {
        const dateVal = this._validateDateFormat(releaseDate);
        
        await this._safeQuery(
            'UPDATE games SET release_date = ? WHERE id = ?',
            [dateVal, gameId],
            `Error updating release date for game ${gameId}`
        );
        
        logger.info(`Updated release date to ${releaseDate} for game ID ${gameId}`);
        return true;
    }

    // Guild-Game relationship methods
    async linkGameToGuild(guildId, gameId) {
        guildId = this._ensureString(guildId);
        await this._safeQuery(
            'INSERT INTO guild_games (guild_id, game_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE guild_id = guild_id',
            [guildId, gameId],
            `Error linking game ${gameId} to guild ${guildId}`
        );
    }

    async unlinkGameFromGuild(guildId, gameId) {
        guildId = this._ensureString(guildId);
        await this._safeQuery(
            'DELETE FROM guild_games WHERE guild_id = ? AND game_id = ?',
            [guildId, gameId],
            `Error unlinking game ${gameId} from guild ${guildId}`
        );
    }

    async isGameSubscribed(guildId, gameId) {
        guildId = this._ensureString(guildId);
        
        try {
            const result = await this._safeQuery(
                'SELECT 1 FROM guild_games WHERE guild_id = ? AND game_id = ?',
                [guildId, gameId],
                `Error checking subscription for game ${gameId} in guild ${guildId}`
            );
            
            return result.length > 0;
        } catch (error) {
            logger.error(`Error checking if game ${gameId} is subscribed for guild ${guildId}: ${error.message}`);
            throw error;
        }
    }

    async getGuildGames(guildId) {
        guildId = this._ensureString(guildId);
        return await this._safeQuery(`
            SELECT g.id, g.name, g.release_date
            FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ?
            ORDER BY g.name
        `, [guildId], `Error fetching games for guild ${guildId}`);
    }

    async getGuildGame(guildId, gameName) {
        guildId = this._ensureString(guildId);
        const rows = await this._safeQuery(`
            SELECT g.id, g.name, g.release_date
            FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ? AND g.name = ?
        `, [guildId, gameName], `Error fetching game ${gameName} for guild ${guildId}`);
        
        return rows.length === 0 ? null : rows[0];
    }

    async getGuildGameStats(guildId) {
        guildId = this._ensureString(guildId);
        
        try {
            // Optimize to use a single query with subqueries
            const result = await this._safeQuery(`
                SELECT 
                    (SELECT COUNT(*) FROM games) as totalGames,
                    (SELECT COUNT(*) FROM guild_games WHERE guild_id = ?) as subscribedGames
            `, [guildId], `Error fetching game stats for guild ${guildId}`);
            
            return {
                totalGames: result[0].totalGames,
                subscribedGames: result[0].subscribedGames
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
            const countResult = await this._safeQuery(countQuery, countParams, `Error counting games for guild ${guildId}`);
            const totalGames = countResult[0].total;
            
            // Get paginated games
            logger.debug(`Final SQL params: ${JSON.stringify(params)}`);
            const games = await this._safeQuery(baseQuery, params, `Error fetching paginated games for guild ${guildId}`);
            
            // Fetch all game sources in one query for better performance
            const gameIds = games.map(g => g.id);
            let gameSources = [];
            
            if (gameIds.length > 0) {
                gameSources = await this._safeQuery(
                    `SELECT game_id, type, source_id, last_update 
                     FROM game_sources 
                     WHERE game_id IN (?)`,
                    [gameIds],
                    `Error fetching sources for games ${gameIds}`
                );
            }
            
            // Group sources by game_id
            const sourcesByGameId = {};
            for (const source of gameSources) {
                if (!sourcesByGameId[source.game_id]) {
                    sourcesByGameId[source.game_id] = [];
                }
                sourcesByGameId[source.game_id].push({
                    [source.type]: source.source_id,
                    lastUpdate: source.last_update
                });
            }
            
            // Build result with sources included
            const result = games.map(game => ({
                id: game.id,
                name: game.name,
                sources: sourcesByGameId[game.id] || [],
                subscribed: game.subscribed === 1,
                ...(game.release_date && { releaseDate: game.release_date })
            }));
            
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
        const rows = await this._safeQuery(
            'SELECT id, name, release_date FROM games WHERE release_date = ? ORDER BY name',
            [date],
            `Error fetching games releasing on ${date}`
        );
        
        return rows.map(game => ({
            id: game.id,
            name: game.name,
            releaseDate: game.release_date
        }));
    }
    
    async getGamesWithMissingReleaseDate() {
        // Optimize by using a JOIN query
        const results = await this._safeQuery(`
            SELECT g.id, g.name, gs.type, gs.source_id, gs.last_update
            FROM games g
            LEFT JOIN game_sources gs ON g.id = gs.game_id
            WHERE g.release_date IS NULL
            ORDER BY g.name
        `, [], 'Error fetching games with missing release dates');
        
        // Process the results
        const gamesMap = new Map();
        
        for (const row of results) {
            if (!gamesMap.has(row.id)) {
                gamesMap.set(row.id, {
                    id: row.id,
                    name: row.name,
                    sources: []
                });
            }
            
            const game = gamesMap.get(row.id);
            
            // Only add sources if they exist
            if (row.type && row.source_id) {
                game.sources.push({
                    [row.type]: row.source_id,
                    lastUpdate: row.last_update
                });
            }
        }
        
        return Array.from(gamesMap.values());
    }

    // Game queries
    async getGuildsForGame(gameName) {
        return await this._safeQuery(`
            SELECT guilds.id, guilds.channel_id, guilds.webhook_url
            FROM guilds
            JOIN guild_games gg ON guilds.id = gg.guild_id
            JOIN games g ON gg.game_id = g.id
            WHERE g.name = ?
        `, [gameName], `Error fetching guilds for game ${gameName}`);
    }

    // Session methods
    async getSession(sessionId) {
        try {
            const rows = await this._safeQuery(
                'SELECT * FROM sessions WHERE session_id = ? AND expires > ?',
                [sessionId, Date.now()],
                `Error getting session ${sessionId}`
            );
            
            return rows.length === 0 ? null : {
                id: rows[0].session_id,
                expires: rows[0].expires,
                data: rows[0].data
            };
        } catch (error) {
            logger.error(`Error getting session ${sessionId}: ${error.message}`);
            return null;
        }
    }
    
    async setSession(sessionId, data, maxAge) {
        const expires = Date.now() + maxAge;
        
        try {
            await this._safeQuery(
                'INSERT INTO sessions (session_id, data, expires) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)',
                [sessionId, data, expires],
                `Error setting session ${sessionId}`
            );
            return true;
        } catch (error) {
            logger.error(`Error setting session ${sessionId}: ${error.message}`);
            return false;
        }
    }
    
    async destroySession(sessionId) {
        try {
            await this._safeQuery(
                'DELETE FROM sessions WHERE session_id = ?',
                [sessionId],
                `Error destroying session ${sessionId}`
            );
            return true;
        } catch (error) {
            logger.error(`Error destroying session ${sessionId}: ${error.message}`);
            return false;
        }
    }
    
    async getAllSessions() {
        try {
            return await this._safeQuery(
                'SELECT * FROM sessions WHERE expires > ?',
                [Date.now()],
                'Error getting all sessions'
            );
        } catch (error) {
            logger.error(`Error getting all sessions: ${error.message}`);
            return [];
        }
    }
    
    async clearExpiredSessions() {
        try {
            const result = await this._safeQuery(
                'DELETE FROM sessions WHERE expires <= ?',
                [Date.now()],
                'Error clearing expired sessions'
            );
            logger.debug(`Cleared ${result.affectedRows} expired sessions`);
            return result.affectedRows || 0;
        } catch (error) {
            logger.error(`Error clearing expired sessions: ${error.message}`);
            return 0;
        }
    }

    // Cleanup
    async close() {
        try {
            await this.pool.end();
            logger.info('Database connection pool closed');
        } catch (error) {
            logger.error(`Error closing database connection pool: ${error.message}`);
        }
    }

    async getUpcomingGames() {
        try {
            const today = new Date();
            const formattedToday = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
            
            logger.debug(`Fetching upcoming games from ${formattedToday} onwards`);
            
            // Get all games with release dates in the future
            const results = await this._safeQuery(`
                SELECT g.id, g.name, g.release_date, gs.type, gs.source_id, gs.last_update
                FROM games g
                LEFT JOIN game_sources gs ON g.id = gs.game_id
                WHERE g.release_date >= ?
                ORDER BY g.release_date, g.name
            `, [formattedToday], 'Error fetching upcoming games');
            
            // Process the results to group sources by game
            const gamesMap = new Map();
            
            for (const row of results) {
                if (!gamesMap.has(row.id)) {
                    gamesMap.set(row.id, {
                        id: row.id,
                        name: row.name,
                        releaseDate: row.release_date,
                        sources: []
                    });
                }
                
                const game = gamesMap.get(row.id);
                
                // Only add sources if they exist
                if (row.type && row.source_id) {
                    game.sources.push({
                        [row.type]: row.source_id,
                        lastUpdate: row.last_update
                    });
                }
            }
            
            const games = Array.from(gamesMap.values());
            logger.info(`Found ${games.length} upcoming games`);
            return games;
        } catch (error) {
            logger.error(`Error fetching upcoming games: ${error.message}`);
            throw error;
        }
    }
}

module.exports = DatabaseManager;