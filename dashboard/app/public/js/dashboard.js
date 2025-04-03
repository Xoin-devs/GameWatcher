import gameService from './application/gameService.js';
import GameList from './presentation/gameList.js';
import ServerList from './presentation/serverList.js';

/**
 * DashboardController coordinates the dashboard functionality
 * It connects UI components with the application services
 */
class DashboardController {
    constructor() {
        // State
        this.currentGuildId = null;
        this.filters = {
            page: 1,
            search: '',
            filter: ''
        };
        this.guildStats = { totalGames: 0, subscribedGames: 0 };
        
        // Components
        this.gamesContainer = document.getElementById('gamesContainer');
        this.serverItems = document.querySelectorAll('.server-item');
        
        // Initialize UI components
        this.initComponents();
    }
    
    /**
     * Initialize UI components
     */
    initComponents() {
        // Initialize server list
        this.serverList = new ServerList(
            this.serverItems, 
            this.handleServerSelect.bind(this)
        );
        this.serverList.addTouchFeedback();
        
        // Initialize game list
        this.gameList = new GameList(
            this.gamesContainer
        );
    }
    
    /**
     * Handle server selection
     * @param {string} guildId - Selected guild ID
     */
    async handleServerSelect(guildId) {
        // Update state
        this.currentGuildId = guildId;
        this.resetFilters();
        
        // Load data
        await this.loadGuildStats();
        await this.loadGames();
    }
    
    /**
     * Reset filters to default state
     */
    resetFilters() {
        this.filters = {
            page: 1,
            search: '',
            filter: ''
        };
    }
    
    /**
     * Load guild game statistics
     */
    async loadGuildStats() {
        if (!this.currentGuildId) return;
        
        try {
            this.guildStats = await gameService.getGuildStats(this.currentGuildId);
        } catch (error) {
            console.error('Error fetching guild stats:', error);
            this.guildStats = { totalGames: 0, subscribedGames: 0 };
        }
    }
    
    /**
     * Load games with current filters
     */
    async loadGames() {
        if (!this.currentGuildId) return;
        
        this.gameList.showLoading();
        
        try {
            // Get games with current filters
            const result = await gameService.getGuildGames(
                this.currentGuildId,
                this.filters.page,
                20,
                this.filters.search,
                this.filters.filter
            );
            
            // Render game list
            this.gameList.render(result, this.guildStats, this.filters);
            
            // Setup event handlers
            this.gameList.setupEventHandlers({
                onSearch: this.handleSearch.bind(this),
                onFilter: this.handleFilterChange.bind(this),
                onPageChange: this.handlePageChange.bind(this),
                onToggleSubscription: this.handleToggleSubscription.bind(this)
            });
            
            // Add touch feedback for mobile
            this.addTouchFeedback();
            
        } catch (error) {
            this.gameList.showError(error);
        }
    }
    
    /**
     * Handle search input
     * @param {string} searchValue - Search term
     */
    handleSearch(searchValue) {
        if (this.filters.search === searchValue) return;
        
        this.filters.search = searchValue;
        this.filters.page = 1; // Reset to first page
        this.loadGames();
    }
    
    /**
     * Handle filter change
     * @param {string} filterValue - Filter value
     */
    handleFilterChange(filterValue) {
        if (this.filters.filter === filterValue) return;
        
        this.filters.filter = filterValue;
        this.filters.page = 1; // Reset to first page
        this.loadGames();
    }
    
    /**
     * Handle page change
     * @param {number} pageNumber - New page number
     */
    handlePageChange(pageNumber) {
        if (this.filters.page === pageNumber) return;
        
        this.filters.page = pageNumber;
        this.loadGames();
        
        // Scroll to top of games panel
        this.gamesContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Handle game subscription toggle
     * @param {string} gameId - Game ID
     * @param {boolean} subscribe - Whether to subscribe or unsubscribe
     */
    async handleToggleSubscription(gameId, subscribe) {
        if (!this.currentGuildId || !gameId) return;
        
        try {
            // Optimistic UI update
            this.gameList.updateGameCard(gameId, subscribe);
            
            // Update stats locally
            if (subscribe) {
                this.guildStats.subscribedGames++;
            } else {
                this.guildStats.subscribedGames = Math.max(0, this.guildStats.subscribedGames - 1);
            }
            
            // Update the stats display
            const gamesCountEl = document.querySelector('.games-count');
            if (gamesCountEl) {
                gamesCountEl.textContent = `(${this.guildStats.subscribedGames} subscribed)`;
            }
            
            // Call API
            await gameService.toggleSubscription(this.currentGuildId, gameId, subscribe);
            
        } catch (error) {
            // Revert UI changes on error
            this.gameList.updateGameCard(gameId, !subscribe);
            
            // Revert stats
            if (subscribe) {
                this.guildStats.subscribedGames--;
            } else {
                this.guildStats.subscribedGames++;
            }
            
            // Update the stats display
            const gamesCountEl = document.querySelector('.games-count');
            if (gamesCountEl) {
                gamesCountEl.textContent = `(${this.guildStats.subscribedGames} subscribed)`;
            }
            
            // Show error
            alert(`Failed to ${subscribe ? 'subscribe to' : 'unsubscribe from'} game: ${error.message}`);
        }
    }
    
    /**
     * Add touch feedback for mobile devices
     */
    addTouchFeedback() {
        const buttons = document.querySelectorAll('.pagination-btn, .search-button');
        
        buttons.forEach(el => {
            // Touch start - add active class
            el.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            }, { passive: true });
            
            // Touch end/cancel - remove active class
            ['touchend', 'touchcancel'].forEach(eventType => {
                el.addEventListener(eventType, function() {
                    this.classList.remove('touch-active');
                }, { passive: true });
            });
        });
    }
}

// Initialize the dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DashboardController();
});
