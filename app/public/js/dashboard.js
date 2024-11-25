
document.addEventListener('DOMContentLoaded', () => {
    const guildItems = document.querySelectorAll('.guild-item');
    const gamesContainer = document.getElementById('gamesContainer');

    async function loadGames(guildId) {
        try {
            const response = await fetch(`/api/games/${guildId}`);
            const games = await response.json();
            
            gamesContainer.innerHTML = `
                <h2>Games List</h2>
                <div class="mb-3">
                    <button class="btn btn-primary" onclick="addGame('${guildId}')">Add Game</button>
                </div>
                <div class="list-group">
                    ${games.map(game => `
                        <div class="list-group-item">
                            <h5>${game.name}</h5>
                            ${game.releaseDate ? `<p>Release Date: ${game.releaseDate}</p>` : ''}
                            <p>Sources: ${game.sources.map(s => Object.keys(s)[0]).join(', ') || 'None'}</p>
                            <button class="btn btn-danger btn-sm" onclick="removeGame('${guildId}', '${game.name}')">Remove</button>
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