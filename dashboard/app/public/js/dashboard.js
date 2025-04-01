document.addEventListener('DOMContentLoaded', function() {
    const guildItems = document.querySelectorAll('.guild-item');
    const gamesContainer = document.getElementById('gamesContainer');
    
    guildItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const guildId = this.getAttribute('data-guild-id');
            
            guildItems.forEach(g => g.classList.remove('active'));
            this.classList.add('active');
            
            loadGames(guildId);
        });
    });
    
    async function loadGames(guildId) {
        try {
            // Build API URL based on environment
            // If apiBaseUrl is empty (in production), we use relative URL
            // If it contains a value (in development), we use the full URL
            const url = `${apiBaseUrl}/api/games/${guildId}`;
            console.log(`Loading games for guild ${guildId} from ${url}`);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }
            
            const games = await response.json();
            console.log(`Received ${games.length} games from API`);

            gamesContainer.innerHTML = `
                <h2>Games List</h2>
                <div class="list-group">
                    ${games.map(game => `
                        <div class="list-group-item">
                            <h5>${game.name}</h5>
                            ${game.releaseDate ? `<p>Release Date: ${game.releaseDate}</p>` : ''}
                            <p>Sources: ${game.sources.map(s => Object.keys(s)[0]).join(', ') || 'None'}</p>
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="game-${game.id}" 
                                       ${game.subscribed ? 'checked' : ''} 
                                       onchange="toggleSubscription('${guildId}', '${game.id}', this.checked)">
                                <label class="form-check-label" for="game-${game.id}">
                                    ${game.subscribed ? 'Subscribed' : 'Subscribe'}
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading games:', error);
            gamesContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h4>Error Loading Games</h4>
                    <p>${error.message}</p>
                    <p>Please check the console for more details.</p>
                </div>
            `;
        }
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
            return;
        }
        
        const label = document.querySelector(`label[for="game-${gameId}"]`);
        if (label) {
            label.textContent = subscribe ? 'Subscribed' : 'Subscribe';
        }
        
        console.log('Subscription updated successfully');
    } catch (error) {
        console.error('Error toggling subscription:', error);
        alert(`An error occurred while ${subscribe ? 'subscribing to' : 'unsubscribing from'} the game.`);
    }
}
