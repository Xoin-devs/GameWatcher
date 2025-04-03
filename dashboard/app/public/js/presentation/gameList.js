import formatters from '../utils/formatters.js';

/**
 * Component for displaying and managing the game list
 */
class GameList {
    /**
     * Initialize the component
     * @param {HTMLElement} container - Container element for the game list
     * @param {Function} onSubscriptionChange - Callback for subscription changes
     */
    constructor(container, onSubscriptionChange) {
        this.container = container;
        this.onSubscriptionChange = onSubscriptionChange;
    }
    
    /**
     * Show loading state
     */
    showLoading() {
        this.container.innerHTML = '<h2>Loading games...</h2><div class="loading-spinner"></div>';
    }
    
    /**
     * Show error state
     * @param {Error} error - Error that occurred
     */
    showError(error) {
        this.container.innerHTML = `
            <h2>Error Loading Games</h2>
            <div class="error-message">
                <p>${error.message}</p>
                <p>Please try again later or contact support.</p>
            </div>
        `;
    }
    
    /**
     * Render the game list
     * @param {Object} data - Game data with games and pagination
     * @param {Object} stats - Game statistics
     * @param {Object} filters - Current filter state (search, filter, page)
     */
    render(data, stats, filters) {
        const { games, pagination } = data;
        const { search, filter, page } = filters;
        
        let content = `
            <h2>Games List <span class="games-count">(${stats.subscribedGames} subscribed)</span></h2>
            ${this.createSearchAndFilterControls(search, filter)}
        `;
        
        if (games.length === 0) {
            content += `<p class="no-games-message">No games available for this server${search ? ` matching "${search}"` : ''}${filter ? ` (${filter})` : ''}.</p>`;
            this.container.innerHTML = content;
            return;
        }

        content += `
            <div class="games-grid">
                ${games.map(game => this.createGameCard(game)).join('')}
            </div>
            ${this.createPaginationControls(pagination)}
        `;
        
        this.container.innerHTML = content;
    }
    
    /**
     * Create HTML for a game card
     * @param {Object} game - Game object
     * @returns {string} - HTML for game card
     */
    createGameCard(game) {
        return `
            <div class="game-card" 
                data-game-id="${game.id}" 
                data-subscribed="${game.subscribed}" 
                tabindex="0" 
                role="button" 
                aria-pressed="${game.subscribed ? 'true' : 'false'}" 
                aria-label="${game.name}, ${formatters.formatDate(game.releaseDate)}, ${game.subscribed ? 'Subscribed' : 'Not subscribed'}">
                <h3 class="game-title">${game.name}</h3>
                <div class="game-release-date">Release: ${formatters.formatDate(game.releaseDate)}</div>
                <div class="game-sources">
                    ${this.createSourceChips(game.sources)}
                </div>
                <div class="toggle-container">
                    <span class="subscribe-label">${game.subscribed ? 'Subscribed' : 'Subscribe'}</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="game-${game.id}" 
                            ${game.subscribed ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
    }
    
    /**
     * Create source chips HTML
     * @param {Array} sources - Source objects
     * @returns {string} - HTML for source chips
     */
    createSourceChips(sources) {
        if (!sources || sources.length === 0) {
            return '<span>No sources</span>';
        }
        
        // Track which source types we've already added
        const addedSources = new Set();
        const chips = [];
        
        sources.forEach(sourceObj => {
            const sourceKey = Object.keys(sourceObj)[0];
            const sourceInfo = formatters.getSourceInfo(sourceKey);
            
            // Create a key for deduplication (use the label for display consistency)
            const dedupeKey = sourceInfo.label.toLowerCase();
            
            // Only add this source if we haven't added it already
            if (!addedSources.has(dedupeKey)) {
                addedSources.add(dedupeKey);
                chips.push(`<span class="source-chip ${sourceInfo.class}">${sourceInfo.label}</span>`);
            }
        });
        
        return chips.join('');
    }
    
    /**
     * Create search and filter controls HTML
     * @param {string} currentSearch - Current search term
     * @param {string} currentFilter - Current filter
     * @returns {string} - HTML for controls
     */
    createSearchAndFilterControls(currentSearch, currentFilter) {
        return `
            <div class="games-controls">
                <div class="search-container">
                    <input type="text" id="game-search" class="search-input" placeholder="Search games..." 
                           value="${currentSearch}" aria-label="Search games">
                    <button id="search-btn" class="search-button" aria-label="Search">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"></path>
                        </svg>
                    </button>
                </div>
                <div class="filter-container">
                    <select id="filter-select" class="filter-select" aria-label="Filter games">
                        <option value="" ${currentFilter === '' ? 'selected' : ''}>All games</option>
                        <option value="subscribed" ${currentFilter === 'subscribed' ? 'selected' : ''}>Subscribed</option>
                        <option value="unsubscribed" ${currentFilter === 'unsubscribed' ? 'selected' : ''}>Not subscribed</option>
                    </select>
                </div>
            </div>
        `;
    }
    
    /**
     * Create pagination controls HTML
     * @param {Object} pagination - Pagination object
     * @returns {string} - HTML for pagination controls
     */
    createPaginationControls(pagination) {
        if (!pagination || pagination.totalPages <= 1) {
            return '';
        }
        
        const controls = [];
        const currentPage = pagination.page;
        const totalPages = pagination.totalPages;
        
        // Previous button
        controls.push(`
            <button class="pagination-btn prev-btn" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">
                &laquo;
            </button>
        `);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust start page if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            controls.push(`
                <button class="pagination-btn page-num ${i === currentPage ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `);
        }
        
        // Next button
        controls.push(`
            <button class="pagination-btn next-btn" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Next page">
                &raquo;
            </button>
        `);
        
        return `
            <div class="pagination">
                <span class="pagination-info">Page ${currentPage} of ${totalPages} (${pagination.total} games)</span>
                <div class="pagination-controls">
                    ${controls.join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Setup event handlers for the game list
     * @param {Object} callbacks - Callback functions for events
     */
    setupEventHandlers(callbacks) {
        const { onSearch, onFilter, onPageChange, onToggleSubscription } = callbacks;
        
        // Search button click
        const searchBtn = document.getElementById('search-btn');
        const searchInput = document.getElementById('game-search');
        
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                onSearch(searchInput.value.trim());
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    onSearch(searchInput.value.trim());
                }
            });
        }
        
        // Filter change
        const filterSelect = document.getElementById('filter-select');
        if (filterSelect) {
            filterSelect.addEventListener('change', () => {
                onFilter(filterSelect.value);
            });
        }
        
        // Pagination buttons
        document.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                
                let newPage;
                if (btn.classList.contains('prev-btn')) {
                    newPage = parseInt(btn.getAttribute('data-page'), 10) - 1;
                } else if (btn.classList.contains('next-btn')) {
                    newPage = parseInt(btn.getAttribute('data-page'), 10) + 1;
                } else {
                    newPage = parseInt(btn.getAttribute('data-page'), 10);
                }
                
                onPageChange(newPage);
            });
        });
        
        // Game cards
        document.querySelectorAll('.game-card').forEach(card => {
            // Click handler
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking directly on the checkbox
                if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                    return;
                }
                
                const gameId = card.getAttribute('data-game-id');
                const currentSubscribed = card.getAttribute('data-subscribed') === 'true';
                onToggleSubscription(gameId, !currentSubscribed);
            });
            
            // Keyboard handler for accessibility
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const gameId = card.getAttribute('data-game-id');
                    const currentSubscribed = card.getAttribute('data-subscribed') === 'true';
                    onToggleSubscription(gameId, !currentSubscribed);
                }
            });
        });
        
        // Checkboxes on game cards
        document.querySelectorAll('.toggle-switch input').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const gameId = checkbox.id.replace('game-', '');
                onToggleSubscription(gameId, checkbox.checked);
            });
        });
    }
    
    /**
     * Update a game card's subscription state
     * @param {string} gameId - Game ID
     * @param {boolean} subscribed - New subscription state
     */
    updateGameCard(gameId, subscribed) {
        const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
        if (!card) return;
        
        // Update checkbox
        const checkbox = card.querySelector(`#game-${gameId}`);
        if (checkbox) checkbox.checked = subscribed;
        
        // Update card state
        card.setAttribute('data-subscribed', subscribed);
        card.setAttribute('aria-pressed', subscribed);
        
        // Update label
        const label = card.querySelector('.subscribe-label');
        if (label) label.textContent = subscribed ? 'Subscribed' : 'Subscribe';
    }
}

export default GameList;