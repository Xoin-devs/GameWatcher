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
                FOREIGN KEY (game_id) REFERENCES games(id),
                PRIMARY KEY (game_id, type)
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
    async addGame(name, sources = [], releaseDate = null) {
        // Validate date format if provided
        if (releaseDate && !releaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            throw new Error(`Invalid date format: ${releaseDate}. Expected YYYY-MM-DD`);
        }

        const result = await this.db.run(
            'INSERT INTO games (name, release_date) VALUES (?, ?)',
            [name, releaseDate]
        );
        const gameId = result.lastID;

        for (const source of sources) {
            for (const [type, sourceId] of Object.entries(source)) {
                if (type === 'lastUpdate') continue;
                
                await this.db.run(
                    'INSERT INTO game_sources (game_id, type, source_id, last_update) VALUES (?, ?, ?, ?)',
                    [gameId, type, sourceId, source.lastUpdate || null]
                );
            }
        }

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

    async removeGame(name) {
        const game = await this.db.get('SELECT id FROM games WHERE name = ?', [name]);
        if (!game) return false;

        await this.db.run('DELETE FROM game_sources WHERE game_id = ?', [game.id]);
        await this.db.run('DELETE FROM games WHERE id = ?', [game.id]);
        return true;
    }

    async getGames() {
        const games = await this.db.all('SELECT * FROM games');
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

    async getGame(name) {
        const game = await this.db.get('SELECT * FROM games WHERE name = ?', [name]);
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

    async close() {
        await this.db.close();
    }
}

module.exports = DatabaseManager;