document.addEventListener('DOMContentLoaded', () => {
    const guildItems = document.querySelectorAll('.guild-item');
    const gamesContainer = document.getElementById('gamesContainer');

    async function loadGames(guildId) {
        try {
            const response = await fetch(`/api/games/${guildId}`);
            const games = await response.json();
            
            gamesContainer.innerHTML = `
                <h2>Games List</h2>
                <div class="list-group">
                    ${games.map(game => `
                        <div class="list-group-item">
                            <h5>${game.name}</h5>
                            ${game.releaseDate ? `<p>Release Date: ${game.releaseDate}</p>` : ''}
                            <p>Sources: ${game.sources.map(s => Object.keys(s)[0]).join(', ') || 'None'}</p>
                            <input type="checkbox" ${game.subscribed ? 'checked' : ''} onchange="toggleSubscription('${guildId}', '${game.id}', this.checked)">
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error loading games:', error);
        }
    }

    guildItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const guildId = item.dataset.guildId;
            loadGames(guildId);
            
            // Update active state
            guildItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
});

async function toggleSubscription(guildId, gameId, subscribe) {
    try {
        const method = subscribe ? 'POST' : 'DELETE';
        const response = await fetch(`/api/games/${guildId}/${gameId}`, { method });
        if (!response.ok) {
            console.error('Error toggling subscription:', await response.json());
        }
    } catch (error) {
        console.error('Error toggling subscription:', error);
    }
}

async function removeGame(guildId, gameName) {
    if (!confirm(`Are you sure you want to remove ${gameName}?`)) return;
    
    try {
        const response = await fetch(`/api/games/${guildId}/${encodeURIComponent(gameName)}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            location.reload();
        }
    } catch (error) {
        console.error('Error removing game:', error);
    }
}

function addGame(guildId) {
    const name = prompt('Enter game name:');
    if (!name) return;
    
    fetch(`/api/games/${guildId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
    })
    .then(response => {
        if (response.ok) {
            location.reload();
        }
    })
    .catch(error => console.error('Error adding game:', error));
}