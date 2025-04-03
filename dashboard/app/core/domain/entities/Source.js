/**
 * Represents a game information source in the domain
 */
class Source {
    /**
     * @param {string} type - The type of source (twitter, steam_internal, steam_external, etc.)
     * @param {string} sourceId - The identifier for the source
     * @param {string|null} lastUpdate - Timestamp of the last update from this source
     */
    constructor(type, sourceId, lastUpdate = null) {
        this.type = type;
        this.sourceId = sourceId;
        this.lastUpdate = lastUpdate;
    }

    /**
     * Get the source type label for display
     * @returns {string} Human-readable label for the source type
     */
    getTypeLabel() {
        switch (this.type) {
            case 'twitter':
                return 'Twitter';
            case 'steam_internal':
                return 'Steam';
            case 'steam_external':
                return 'Steam News';
            default:
                return this.type.charAt(0).toUpperCase() + this.type.slice(1);
        }
    }

    /**
     * Get CSS class for styling the source
     * @returns {string} CSS class name for the source type
     */
    getTypeClass() {
        switch (this.type) {
            case 'twitter':
                return 'source-twitter';
            case 'steam_internal':
            case 'steam_external':
                return 'source-steam';
            default:
                return 'source-default';
        }
    }
}

module.exports = Source;