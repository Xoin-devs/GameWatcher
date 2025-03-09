const DatabaseManager = require('@shared/database');

class CommandHelper {
    static async autoCompleteGameName(interaction) {
        const db = await DatabaseManager.getInstance();
        const focusedValue = interaction.options.getFocused();
        const games = await db.getGames();
        
        const filtered = games
            .map(game => game.name)
            .filter(name => name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25);

        await interaction.respond(
            filtered.map(name => ({ name: name, value: name }))
        );
    }
}

module.exports = CommandHelper;
