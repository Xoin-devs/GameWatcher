/**
 * View model for games API responses
 */
class GameViewModel {
    /**
     * @param {Array} games - List of game domain entities
     * @param {Object} pagination - Pagination domain entity
     */
    constructor(games, pagination) {
        this.games = this.transformGames(games);
        this.pagination = this.transformPagination(pagination);
    }

    /**
     * Transform game entities for display
     * @param {Array} games - Game domain entities
     * @returns {Array} Transformed game data
     */
    transformGames(games) {
        if (!games || !Array.isArray(games)) return [];

        return games.map(game => ({
            id: game.id,
            name: game.name,
            releaseDate: game.releaseDate,
            formattedReleaseDate: game.getFormattedReleaseDate ? 
                game.getFormattedReleaseDate() : 
                this.formatReleaseDate(game.releaseDate),
            sources: this.transformSources(game.sources),
            subscribed: !!game.subscribed,
            isReleased: game.isReleased ? 
                game.isReleased() : 
                this.isGameReleased(game.releaseDate)
        }));
    }

    /**
     * Transform source entities for display
     * @param {Array} sources - Source domain entities
     * @returns {Array} Transformed source data
     */
    transformSources(sources) {
        if (!sources || !Array.isArray(sources)) return [];

        return sources.map(source => {
            const type = source.type;
            const label = source.getTypeLabel ? 
                source.getTypeLabel() : 
                this.getSourceTypeLabel(type);
            
            const cssClass = source.getTypeClass ? 
                source.getTypeClass() : 
                this.getSourceTypeClass(type);

            return {
                type,
                sourceId: source.sourceId,
                lastUpdate: source.lastUpdate,
                label,
                cssClass
            };
        });
    }

    /**
     * Transform pagination entity for display
     * @param {Object} pagination - Pagination domain entity
     * @returns {Object} Transformed pagination data
     */
    transformPagination(pagination) {
        if (!pagination) return { total: 0, page: 1, limit: 20, totalPages: 0 };

        return {
            total: pagination.total,
            page: pagination.page,
            limit: pagination.limit,
            totalPages: pagination.totalPages,
            hasPrevious: pagination.hasPreviousPage ? 
                pagination.hasPreviousPage() : 
                pagination.page > 1,
            hasNext: pagination.hasNextPage ? 
                pagination.hasNextPage() : 
                pagination.page < pagination.totalPages,
            pageNumbers: pagination.getPageNumbers ? 
                pagination.getPageNumbers() : 
                this.getPageNumbersArray(pagination)
        };
    }

    /**
     * Format release date for display
     * @param {string} releaseDate - ISO date string
     * @returns {string} Formatted date
     */
    formatReleaseDate(releaseDate) {
        if (!releaseDate) return 'To be announced';
        
        try {
            const date = new Date(releaseDate);
            if (isNaN(date.getTime())) return 'To be announced';
            
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            return 'To be announced';
        }
    }

    /**
     * Check if a game has been released
     * @param {string} releaseDate - ISO date string
     * @returns {boolean} Whether the game is released
     */
    isGameReleased(releaseDate) {
        if (!releaseDate) return false;
        
        try {
            const now = new Date();
            const release = new Date(releaseDate);
            return release <= now;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get label for source type
     * @param {string} type - Source type
     * @returns {string} Readable label
     */
    getSourceTypeLabel(type) {
        switch (type) {
            case 'twitter':
                return 'Twitter';
            case 'steam_internal':
                return 'Steam';
            case 'steam_external':
                return 'Steam News';
            default:
                return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }

    /**
     * Get CSS class for source type
     * @param {string} type - Source type
     * @returns {string} CSS class
     */
    getSourceTypeClass(type) {
        switch (type) {
            case 'twitter':
                return 'source-twitter';
            case 'steam_internal':
            case 'steam_external':
                return 'source-steam';
            default:
                return 'source-default';
        }
    }

    /**
     * Generate array of page numbers for pagination
     * @param {Object} pagination - Pagination data
     * @returns {Array} Array of page numbers
     */
    getPageNumbersArray(pagination) {
        const maxButtons = 5;
        
        if (pagination.totalPages <= maxButtons) {
            return Array.from({ length: pagination.totalPages }, (_, i) => i + 1);
        }

        // Always include first, last, and current page
        const pages = [1, pagination.page, pagination.totalPages];
        
        // Add pages before and after current
        const beforeCurrent = pagination.page - 1;
        const afterCurrent = pagination.page + 1;
        
        if (beforeCurrent > 1) pages.push(beforeCurrent);
        if (afterCurrent < pagination.totalPages) pages.push(afterCurrent);
        
        // Sort and remove duplicates
        return [...new Set(pages)].sort((a, b) => a - b);
    }

    /**
     * Get the view model data
     * @returns {Object} View model data
     */
    toViewModel() {
        return {
            games: this.games,
            pagination: this.pagination
        };
    }
}

module.exports = GameViewModel;