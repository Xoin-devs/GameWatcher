document.addEventListener('DOMContentLoaded', function() {
    const serverItems = document.querySelectorAll('.server-item');
    const gamesContainer = document.getElementById('gamesContainer');
    let currentGuildId = null;
    let currentPage = 1;
    let currentSearch = '';
    let currentFilter = '';
    
    // Add both click and keydown (Enter/Space) handlers for accessibility
    serverItems.forEach(item => {
        // Click handler
        item.addEventListener('click', function(e) {
            e.preventDefault();
            selectServer(this);
        });
        
        // Keyboard handler for accessibility
        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectServer(this);
            }
        });
    });
    
    function selectServer(serverItem) {
        // Always store guildId as string to avoid BigInt issues
        const guildId = String(serverItem.getAttribute('data-guild-id'));
        currentGuildId = guildId;
        
        // Reset pagination and filters when selecting a new server
        currentPage = 1;
        currentSearch = '';
        currentFilter = '';
        
        serverItems.forEach(g => g.classList.remove('active'));
        serverItem.classList.add('active');
        
        loadGames();
        
        // On mobile, scroll to games section after selecting a server
        if (window.innerWidth <= 768) {
            const gamesPanel = document.querySelector('.games-panel');
            if (gamesPanel) {
                gamesPanel.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
    
    // Format date to a more readable format
    function formatDate(dateString) {
        if (!dateString) return 'To be announced';
        
        try {
            const date = new Date(dateString);
            // Check if date is valid
            if (isNaN(date.getTime())) return 'To be announced';
            
            // Format: Month Day, Year
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'To be announced';
        }
    }
    
    // Function to get appropriate class and label for source type
    function getSourceInfo(sourceKey) {
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
    
    // Create source chips HTML with deduplication
    function createSourceChips(sources) {
        if (!sources || sources.length === 0) {
            return '<span>No sources</span>';
        }
        
        // Track which source types we've already added
        const addedSources = new Set();
        const chips = [];
        
        sources.forEach(sourceObj => {
            const sourceKey = Object.keys(sourceObj)[0];
            const sourceInfo = getSourceInfo(sourceKey);
            
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
    
    // Create pagination controls HTML
    function createPaginationControls(pagination) {
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
    
    // Create search and filter controls
    function createSearchAndFilterControls() {
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
    
    async function loadGames() {
        if (!currentGuildId) return;
        
        gamesContainer.innerHTML = '<h2>Loading games...</h2><div class="loading-spinner"></div>';
        
        try {
            // Build URL with query parameters for pagination, search, and filtering
            let url = `${apiBaseUrl}/api/games/${currentGuildId}?page=${currentPage}&limit=20`;
            if (currentSearch) {
                url += `&search=${encodeURIComponent(currentSearch)}`;
            }
            if (currentFilter) {
                url += `&filter=${encodeURIComponent(currentFilter)}`;
            }
            
            console.log(`Loading games for guild ${currentGuildId} from ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            const games = result.games || [];
            const pagination = result.pagination || { total: games.length, page: 1, totalPages: 1 };
            
            console.log(`Received ${games.length} games from API (page ${pagination.page} of ${pagination.totalPages})`);

            // Always render search and filter controls, even if there are no games
            let content = `
                <h2>Games List</h2>
                ${createSearchAndFilterControls()}
            `;
            
            if (games.length === 0) {
                content += `<p class="no-games-message">No games available for this server${currentSearch ? ` matching "${currentSearch}"` : ''}${currentFilter ? ` (${currentFilter})` : ''}.</p>`;
                gamesContainer.innerHTML = content;
                
                // Even when there are no games, attach search and filter handlers
                attachSearchHandlers();
                attachFilterHandlers();
                
                return;
            }

            content += `
                <div class="games-grid">
                    ${games.map(game => `
                        <div class="game-card" data-game-id="${game.id}" data-guild-id="${currentGuildId}" data-subscribed="${game.subscribed}" tabindex="0" role="button" aria-pressed="${game.subscribed ? 'true' : 'false'}" aria-label="${game.name}, ${formatDate(game.releaseDate)}, ${game.subscribed ? 'Subscribed' : 'Not subscribed'}">
                            <h3 class="game-title">${game.name}</h3>
                            <div class="game-release-date">Release: ${formatDate(game.releaseDate)}</div>
                            <div class="game-sources">
                                ${createSourceChips(game.sources)}
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
                    `).join('')}
                </div>
                ${createPaginationControls(pagination)}
            `;
            
            gamesContainer.innerHTML = content;
            
            // Add click handlers to game cards
            document.querySelectorAll('.game-card').forEach(card => {
                // Click handler
                card.addEventListener('click', function(e) {
                    // Don't trigger if clicking directly on the checkbox
                    if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                        return;
                    }
                    
                    toggleGameSubscription(this);
                });
                
                // Keyboard handler for accessibility
                card.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGameSubscription(this);
                    }
                });
            });
            
            // Prevent the checkbox from toggling the card's onClick event when clicked directly
            document.querySelectorAll('.toggle-switch input').forEach(checkbox => {
                checkbox.addEventListener('click', function(e) {
                    e.stopPropagation();
                    
                    const card = this.closest('.game-card');
                    const newSubscribed = this.checked;
                    
                    updateCardUI(card, newSubscribed);
                    
                    const gameId = this.id.replace('game-', '');
                    const guildId = card.getAttribute('data-guild-id');
                    toggleSubscription(guildId, gameId, newSubscribed);
                });
            });
            
            // Add pagination event handlers
            document.querySelectorAll('.pagination-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    if (this.disabled) return;
                    
                    if (this.classList.contains('prev-btn')) {
                        currentPage = Math.max(1, currentPage - 1);
                    } else if (this.classList.contains('next-btn')) {
                        currentPage = Math.min(pagination.totalPages, currentPage + 1);
                    } else {
                        currentPage = parseInt(this.getAttribute('data-page'), 10);
                    }
                    
                    loadGames();
                    // Scroll to top of games panel
                    gamesContainer.scrollIntoView({ behavior: 'smooth' });
                });
            });
            
            // Add search handlers
            attachSearchHandlers();
            
            // Add filter change handler
            attachFilterHandlers();
            
            // Add touch feedback for mobile
            addTouchFeedback();
        } catch (error) {
            console.error('Error loading games:', error);
            gamesContainer.innerHTML = `
                <h2>Error Loading Games</h2>
                <div class="error-message">
                    <p>${error.message}</p>
                    <p>Please try again later or contact support.</p>
                </div>
                ${createSearchAndFilterControls()}
            `;
            
            // Even on error, attach event handlers to search and filter controls
            attachSearchHandlers();
            attachFilterHandlers();
        }
    }
    
    function toggleGameSubscription(card) {
        const gameId = card.getAttribute('data-game-id');
        const guildId = card.getAttribute('data-guild-id');
        const currentSubscribed = card.getAttribute('data-subscribed') === 'true';
        const newSubscribed = !currentSubscribed;
        
        // Update UI
        updateCardUI(card, newSubscribed);
        
        // Call API
        toggleSubscription(guildId, gameId, newSubscribed);
    }
    
    function updateCardUI(card, subscribed) {
        // Update the checkbox
        const gameId = card.getAttribute('data-game-id');
        const checkbox = card.querySelector(`#game-${gameId}`);
        checkbox.checked = subscribed;
        
        // Update the card data attribute and aria state
        card.setAttribute('data-subscribed', subscribed);
        card.setAttribute('aria-pressed', subscribed);
        
        // Update the label
        const label = card.querySelector('.subscribe-label');
        if (label) {
            label.textContent = subscribed ? 'Subscribed' : 'Subscribe';
        }
    }
    
    // Add touch feedback for mobile devices
    function addTouchFeedback() {
        const cards = document.querySelectorAll('.game-card');
        const servers = document.querySelectorAll('.server-item');
        const buttons = document.querySelectorAll('.pagination-btn, .search-button');
        
        // Combine all types of elements
        const elements = [...cards, ...servers, ...buttons];
        
        elements.forEach(el => {
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
    
    // Extract search event handlers to a separate function
    function attachSearchHandlers() {
        const searchInput = document.getElementById('game-search');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchInput && searchBtn) {
            // Search button click
            searchBtn.addEventListener('click', function() {
                const searchValue = searchInput.value.trim();
                if (currentSearch !== searchValue) {
                    currentSearch = searchValue;
                    currentPage = 1; // Reset to first page on new search
                    loadGames();
                }
            });
            
            // Enter key in search input
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const searchValue = this.value.trim();
                    if (currentSearch !== searchValue) {
                        currentSearch = searchValue;
                        currentPage = 1; // Reset to first page on new search
                        loadGames();
                    }
                }
            });
        }
    }
    
    // Extract filter event handlers to a separate function
    function attachFilterHandlers() {
        const filterSelect = document.getElementById('filter-select');
        if (filterSelect) {
            // Ensure the filter select has the current value
            filterSelect.value = currentFilter;
            
            filterSelect.addEventListener('change', function() {
                const filterValue = this.value;
                if (currentFilter !== filterValue) {
                    currentFilter = filterValue;
                    currentPage = 1; // Reset to first page on new filter
                    loadGames();
                }
            });
        }
    }
    
    // Global toggle subscription function
    window.toggleSubscription = async function(guildId, gameId, subscribe) {
        try {
            // Ensure guildId is treated as string to avoid BigInt issues
            guildId = String(guildId);
            gameId = String(gameId);
            
            console.log(`${subscribe ? 'Subscribing to' : 'Unsubscribing from'} game ${gameId} for guild ${guildId}`);
            const method = subscribe ? 'POST' : 'DELETE';
            // Using apiBaseUrl for proper environment handling
            const url = `${apiBaseUrl}/api/guilds/${guildId}/games/${gameId}`;
            const response = await fetch(url, { 
                method,
                credentials: 'include'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error toggling subscription:', errorText);
                alert(`Failed to ${subscribe ? 'subscribe to' : 'unsubscribe from'} game. Error: ${response.status}`);
                
                // Revert UI changes on error
                const card = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
                if (card) {
                    const previousState = !subscribe;
                    card.setAttribute('data-subscribed', previousState);
                    
                    const checkbox = card.querySelector(`#game-${gameId}`);
                    if (checkbox) checkbox.checked = previousState;
                    
                    const label = card.querySelector('.subscribe-label');
                    if (label) label.textContent = previousState ? 'Subscribed' : 'Subscribe';
                }
                
                return;
            }
            
            console.log('Subscription updated successfully');
        } catch (error) {
            console.error('Error toggling subscription:', error);
            alert(`An error occurred while ${subscribe ? 'subscribing to' : 'unsubscribing from'} the game.`);
        }
    };
});
