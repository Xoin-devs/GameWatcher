/**
 * Represents a Game entity in the domain
 */
class Game {
    constructor(id, name, releaseDate, sources = [], subscribed = false) {
        this.id = id;
        this.name = name;
        this.releaseDate = releaseDate;
        this.sources = sources;
        this.subscribed = subscribed;
    }

    isReleased() {
        if (!this.releaseDate) return false;
        const now = new Date();
        const release = new Date(this.releaseDate);
        return release <= now;
    }

    getFormattedReleaseDate() {
        if (!this.releaseDate) return 'To be announced';
        
        try {
            const date = new Date(this.releaseDate);
            if (isNaN(date.getTime())) return 'To be announced';
            
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            return 'To be announced';
        }
    }
}

module.exports = Game;