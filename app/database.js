const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
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
        const dbPath = process.env.DB_PATH || 'data.sqlite';
        
        this.db = await open({
            filename: path.join(__dirname, '..', dbPath),
            driver: sqlite3.Database
        });

        logger.info(`Connected to database: ${dbPath}`);
        await this.createTables();
    }

    async createTables() {
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                access_token TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS guilds (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                release_date TEXT
            );

            CREATE TABLE IF NOT EXISTS game_sources (
                game_id INTEGER,
                type TEXT NOT NULL,
                source_id TEXT NOT NULL,
                last_update TEXT,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                PRIMARY KEY (game_id, type)
            );

            CREATE TABLE IF NOT EXISTS guild_games (
                guild_id TEXT,
                game_id INTEGER,
                FOREIGN KEY (guild_id) REFERENCES guilds(id) ON DELETE CASCADE,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
                PRIMARY KEY (guild_id, game_id)
            );
        `);
    }

    // Guild operations
    async addGuild(guildId, channelId) {
        await this.db.run('INSERT OR REPLACE INTO guilds (id, channel_id) VALUES (?, ?)', [guildId, channelId]);
    }

    async removeGuild(guildId) {
        await this.db.run('DELETE FROM guilds WHERE id = ?', [guildId]);
    }

    async getGuilds() {
        return await this.db.all('SELECT * FROM guilds');
    }

    // Game operations
    async addGame(guildId, name, sources = [], releaseDate = null) {
        // Validate date format if provided
        if (releaseDate && !releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error(`Invalid date format: ${releaseDate}. Expected YYYY-MM-DD`);
        }

        let game = await this.getGame(guildId, name);
        let gameId;

        if (!game) {
            const result = await this.db.run(
                'INSERT INTO games (name, release_date) VALUES (?, ?)',
                [name, releaseDate]
            );
            gameId = result.lastID;

            for (const source of sources) {
                for (const [type, sourceId] of Object.entries(source)) {
                    if (type === 'lastUpdate') continue;
                    
                    await this.db.run(
                        'INSERT INTO game_sources (game_id, type, source_id, last_update) VALUES (?, ?, ?, ?)',
                        [gameId, type, sourceId, source.lastUpdate || null]
                    );
                }
            }
        } else {
            gameId = game.id;
        }

        // Link game to guild
        await this.db.run(
            'INSERT OR IGNORE INTO guild_games (guild_id, game_id) VALUES (?, ?)',
            [guildId, gameId]
        );

        return gameId;
    }

    async updateGame(name, sources = [], releaseDate = null) {
        // Validate date format if provided
        if (releaseDate && !releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error(`Invalid date format: ${releaseDate}. Expected YYYY-MM-DD`);
        }

        const game = await this.db.get('SELECT id FROM games WHERE name = ?', [name]);
        if (!game) return false;

        await this.db.run(
            'UPDATE games SET release_date = ? WHERE id = ?',
            [releaseDate, game.id]
        );

        // Remove existing sources for this game
        await this.db.run('DELETE FROM game_sources WHERE game_id = ?', [game.id]);

        // Add new sources
        for (const source of sources) {
            // Skip the lastUpdate key from the source object
            for (const [type, sourceId] of Object.entries(source)) {
                if (type === 'lastUpdate') continue;
                
                await this.db.run(
                    'INSERT INTO game_sources (game_id, type, source_id, last_update) VALUES (?, ?, ?, ?)',
                    [game.id, type, sourceId, source.lastUpdate || null]
                );
            }
        }

        return true;
    }

    async removeGame(guildId, name) {
        const game = await this.db.get('SELECT id FROM games WHERE name = ?', [name]);
        if (!game) return false;

        // Remove game from guild
        await this.db.run(
            'DELETE FROM guild_games WHERE guild_id = ? AND game_id = ?',
            [guildId, game.id]
        );

        // Check if game is still used by other guilds
        const usedByOtherGuilds = await this.db.get(
            'SELECT 1 FROM guild_games WHERE game_id = ?',
            [game.id]
        );

        // If not used by other guilds, remove game completely
        if (!usedByOtherGuilds) {
            await this.db.run('DELETE FROM game_sources WHERE game_id = ?', [game.id]);
            await this.db.run('DELETE FROM games WHERE id = ?', [game.id]);
        }

        return true;
    }

    async getGames(guildId) {
        const games = await this.db.all(`
            SELECT g.* FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ?
        `, [guildId]);
        const result = [];

        for (const game of games) {
            const sources = await this.db.all(
                'SELECT type, source_id, last_update FROM game_sources WHERE game_id = ?',
                [game.id]
            );

            result.push({
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

    async getGame(guildId, name) {
        const game = await this.db.get(`
            SELECT g.* FROM games g
            JOIN guild_games gg ON g.id = gg.game_id
            WHERE gg.guild_id = ? AND g.name = ?
        `, [guildId, name]);
        
        if (!game) return null;

        const sources = await this.db.all(
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

    // Add session management methods
    async saveSession(sessionId, userId, accessToken, expiresAt) {
        await this.db.run(
            'INSERT OR REPLACE INTO sessions (session_id, user_id, access_token, expires_at) VALUES (?, ?, ?, ?)',
            [sessionId, userId, accessToken, expiresAt]
        );
    }

    async getSession(sessionId) {
        return await this.db.get('SELECT * FROM sessions WHERE session_id = ?', [sessionId]);
    }

    async deleteSession(sessionId) {
        await this.db.run('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
    }

    async close() {
        await this.db.close();
    }
}

module.exports = DatabaseManager;