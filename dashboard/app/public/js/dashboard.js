document.addEventListener('DOMContentLoaded', function() {
    const serverItems = document.querySelectorAll('.server-item');
    const gamesContainer = document.getElementById('gamesContainer');
    
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
        const guildId = serverItem.getAttribute('data-guild-id');
        
        serverItems.forEach(g => g.classList.remove('active'));
        serverItem.classList.add('active');
        
        loadGames(guildId);
        
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
    
    async function loadGames(guildId) {
        gamesContainer.innerHTML = '<h2>Loading games...</h2><div class="loading-spinner"></div>';
        
        try {
            const url = `${apiBaseUrl}/api/games/${guildId}`;
            console.log(`Loading games for guild ${guildId} from ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }
            
            const games = await response.json();
            console.log(`Received ${games.length} games from API`);

            if (games.length === 0) {
                gamesContainer.innerHTML = `
                    <h2>Games List</h2>
                    <p>No games available for this server.</p>
                `;
                return;
            }

            gamesContainer.innerHTML = `
                <h2>Games List</h2>
                <div class="games-grid">
                    ${games.map(game => `
                        <div class="game-card" data-game-id="${game.id}" data-guild-id="${guildId}" data-subscribed="${game.subscribed}" tabindex="0" role="button" aria-pressed="${game.subscribed ? 'true' : 'false'}" aria-label="${game.name}, ${formatDate(game.releaseDate)}, ${game.subscribed ? 'Subscribed' : 'Not subscribed'}">
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
            `;
            
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
            `;
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
        
        // Combine both types of elements
        const elements = [...cards, ...servers];
        
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
});

async function toggleSubscription(guildId, gameId, subscribe) {
    try {
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
}
