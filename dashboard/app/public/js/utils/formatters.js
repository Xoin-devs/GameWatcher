/**
 * Utilities for formatting and display
 */
export default {
    /**
     * Format a date for display
     * @param {string} dateString - ISO date string
     * @returns {string} - Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return 'To be announced';
        
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'To be announced';
            
            // Format: Month Day, Year
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            return 'To be announced';
        }
    },
    
    /**
     * Get appropriate class and label for source type
     * @param {string} sourceKey - Source type
     * @returns {Object} - Object with class and label
     */
    getSourceInfo(sourceKey) {
        // Normalize steam sources to just "steam"
        if (sourceKey.toLowerCase().includes('steam')) {
            return { class: 'steam', label: 'Steam' };
        }
        
        const sourcesMap = {
            'twitter': { class: 'twitter', label: 'Twitter' },
            'pcgamer': { class: 'pcgamer', label: 'PC Gamer' },
            'pcgamesn': { class: 'pcgamesn', label: 'PCGamesN' },
            'rps': { class: 'rps', label: 'RPS' },
            'vg247': { class: 'vg247', label: 'VG247' }
        };
        
        return sourcesMap[sourceKey.toLowerCase()] || { class: '', label: sourceKey };
    }
}