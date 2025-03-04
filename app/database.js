const mariadb = require('mariadb');
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
        this.pool = mariadb.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'mydatabase',
            waitForConnections: true,
            connectTimeout: 30000
        });

        logger.info('Connected to MariaDB');
        await this.createTables();
    }

    async createTables() {
        await this.pool.query(`
            CREATE TABLE IF NOT EXISTS guilds (
                id VARCHAR(255) PRIMARY KEY,
                channel_id VARCHAR(255) NOT NULL
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
    }

    async addGuild(guildId, channelId) {
        await this.pool.query(
            'INSERT INTO guilds (id, channel_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE channel_id = VALUES(channel_id)',
            [guildId, channelId]
        );
    }

    async removeGuild(guildId) {
        await this.pool.query('DELETE FROM guilds WHERE id = ?', [guildId]);
    }

    async getGuilds() {
        return await this.pool.query('SELECT * FROM guilds');
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
        const [rows] = await this.pool.query('SELECT id FROM games WHERE name = ?', [name]);
        if (!rows.length) return false;
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

    async removeGame(name) {
        const [rows] = await this.pool.query('SELECT id FROM games WHERE name = ?', [name]);
        if (!rows.length) return false;
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
        const [rows] = await this.pool.query('SELECT * FROM games WHERE name = ?', [name]);
        if (!rows.length) return null;
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

    async close() {
        await this.pool.end();
    }
}

module.exports = DatabaseManager;