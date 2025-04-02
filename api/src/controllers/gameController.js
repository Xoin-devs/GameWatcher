const DatabaseManager = require('@shared/database');

async function getAllGames(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        const games = await db.getGames();
        res.json(games);
    } catch (error) {
        next(error);
    }
}

async function getGame(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        const game = await db.getGame(req.params.name);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.json(game);
    } catch (error) {
        next(error);
    }
}

async function addGame(req, res, next) {
    try {
        const { name, sources, releaseDate } = req.body;
        const db = await DatabaseManager.getInstance();
        const gameId = await db.addGame(name, sources, releaseDate);
        res.status(201).json({ gameId });
    } catch (error) {
        next(error);
    }
}

async function updateGame(req, res, next) {
    try {
        const { name, sources, releaseDate } = req.body;
        const db = await DatabaseManager.getInstance();
        const success = await db.updateGame(name, sources, releaseDate);
        if (!success) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.json({ success });
    } catch (error) {
        next(error);
    }
}

async function deleteGame(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        const success = await db.removeGame(req.params.name);
        if (!success) {
            return res.status(404).json({ error: 'Game not found' });
        }
        res.json({ success });
    } catch (error) {
        next(error);
    }
}

async function linkGameToGuild(req, res, next) {
    try {
        const { guildId } = req.body;
        const db = await DatabaseManager.getInstance();
        const game = await db.getGame(req.params.name);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        await db.linkGameToGuild(guildId, game.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

async function unlinkGameFromGuild(req, res, next) {
    try {
        const { guildId } = req.body;
        const db = await DatabaseManager.getInstance();
        const game = await db.getGame(req.params.name);
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        await db.unlinkGameFromGuild(guildId, game.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

async function updateSourceLastUpdate(req, res, next) {
    try {
        const { sourceType, sourceId, lastUpdate } = req.body;
        const db = await DatabaseManager.getInstance();
        const success = await db.updateSourceLastUpdate(req.params.name, sourceType, sourceId, lastUpdate);
        if (!success) {
            return res.status(404).json({ error: 'Game or source not found' });
        }
        res.json({ success });
    } catch (error) {
        next(error);
    }
}

async function getGuilds(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuilds();
        res.json(guilds);
    } catch (error) {
        next(error);
    }
}

async function getGamesWithSubscriptionStatus(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        // Ensure guildId is treated as string to avoid BigInt issues
        const guildId = String(req.params.guildId);
        
        // Extract query parameters for pagination, search, and filtering
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const search = req.query.search || '';
        const filter = req.query.filter || '';
        
        const result = await db.getPaginatedGuildGames(guildId, page, limit, search, filter);
        
        res.json(result);
    } catch (error) {
        next(error);
    }
}

async function linkGameToGuildById(req, res, next) {
    try {
        // Ensure guildId is treated as string to avoid BigInt issues
        const guildId = String(req.params.guildId);
        const gameId = req.params.gameId;
        const db = await DatabaseManager.getInstance();
        await db.linkGameToGuild(guildId, gameId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

async function unlinkGameFromGuildById(req, res, next) {
    try {
        // Ensure guildId is treated as string to avoid BigInt issues
        const guildId = String(req.params.guildId);
        const gameId = req.params.gameId;
        const db = await DatabaseManager.getInstance();
        await db.unlinkGameFromGuild(guildId, gameId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getAllGames,
    getGame,
    addGame,
    updateGame,
    deleteGame,
    linkGameToGuild,
    unlinkGameFromGuild,
    updateSourceLastUpdate,
    getGuilds,
    getGamesWithSubscriptionStatus,
    linkGameToGuildById,
    unlinkGameFromGuildById
};