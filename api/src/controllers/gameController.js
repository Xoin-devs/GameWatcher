const DatabaseManager = require('@shared/database');

async function getGuilds(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuilds();
        res.json(guilds);
    } catch (error) {
        next(error);
    }
}

async function getGuildDetails(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        // Ensure guildId is treated as string to avoid BigInt issues
        const guildId = String(req.params.guildId);
        const guild = await db.getGuild(guildId);
        
        if (!guild) {
            return res.status(404).json({ error: 'Guild not found' });
        }
        
        res.json(guild);
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

async function getGuildGameStats(req, res, next) {
    try {
        const db = await DatabaseManager.getInstance();
        // Ensure guildId is treated as string to avoid BigInt issues
        const guildId = String(req.params.guildId);
        
        // Get count of games subscribed to by the guild
        const stats = await db.getGuildGameStats(guildId);
        
        res.json(stats);
    } catch (error) {
        next(error);
    }
}

async function toggleGameSubscription(req, res, next) {
    try {
        // Ensure guildId is treated as string to avoid BigInt issues
        const guildId = String(req.params.guildId);
        const gameId = req.params.gameId;
        const db = await DatabaseManager.getInstance();
        
        // Check if subscription exists
        const isSubscribed = await db.isGameSubscribed(guildId, gameId);
        
        if (isSubscribed) {
            // If subscribed, unlink the game
            await db.unlinkGameFromGuild(guildId, gameId);
        } else {
            // If not subscribed, link the game
            await db.linkGameToGuild(guildId, gameId);
        }
        
        res.json({ 
            success: true,
            subscribed: !isSubscribed
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getGuilds,
    getGuildDetails,
    getGamesWithSubscriptionStatus,
    getGuildGameStats,
    toggleGameSubscription
};