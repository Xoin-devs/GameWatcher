const Game = require('../../../core/domain/entities/Game');
const Source = require('../../../core/domain/entities/Source');
const Pagination = require('../../../core/domain/entities/Pagination');

/**
 * Maps data between API/persistence formats and domain entities
 */
class GameMapper {
    /**
     * Convert API game data to domain Game entity
     * @param {Object} gameData - Game data from API
     * @returns {Game} Domain Game entity
     */
    static toDomain(gameData) {
        if (!gameData) return null;
        
        const sources = this.mapSourcesToDomain(gameData.sources || []);
        
        return new Game(
            gameData.id,
            gameData.name,
            gameData.releaseDate,
            sources,
            !!gameData.subscribed
        );
    }
    
    /**
     * Convert API pagination data to domain Pagination entity
     * @param {Object} paginationData - Pagination data from API
     * @returns {Pagination} Domain Pagination entity
     */
    static toPaginationDomain(paginationData) {
        if (!paginationData) return new Pagination(0, 1, 20);
        
        return new Pagination(
            paginationData.total,
            paginationData.page,
            paginationData.limit
        );
    }
    
    /**
     * Convert API source data to domain Source entities
     * @param {Array} sourcesData - Source data from API
     * @returns {Array<Source>} Domain Source entities
     */
    static mapSourcesToDomain(sourcesData) {
        if (!sourcesData || !Array.isArray(sourcesData)) return [];
        
        return sourcesData.map(sourceData => {
            // Each source is an object with a single key (the type)
            // and the value is the source ID
            const type = Object.keys(sourceData)[0];
            if (!type || type === 'lastUpdate') return null;
            
            return new Source(
                type,
                sourceData[type],
                sourceData.lastUpdate
            );
        }).filter(Boolean); // Remove null entries
    }
    
    /**
     * Convert full API game response to domain structure
     * @param {Object} apiResponse - Full API response
     * @returns {Object} Object with games and pagination domain entities
     */
    static apiResponseToDomain(apiResponse) {
        if (!apiResponse) return { games: [], pagination: new Pagination(0, 1, 20) };
        
        const games = (apiResponse.games || []).map(game => this.toDomain(game));
        const pagination = this.toPaginationDomain(apiResponse.pagination);
        
        return {
            games,
            pagination
        };
    }
}

module.exports = GameMapper;