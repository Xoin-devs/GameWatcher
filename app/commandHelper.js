const { PermissionFlagsBits } = require('discord.js');
const DatabaseManager = require('./database');

class CommandHelper {
    static async autoCompleteGameName(interaction) {
        const db = await DatabaseManager.getInstance();
        const focusedValue = interaction.options.getFocused();
        const choices = await db.getGames(interaction.guildId);
        const filtered = choices
            .filter(game => game.name.toLowerCase().includes(focusedValue.toLowerCase()))
            .slice(0, 25);
        
        await interaction.respond(
            filtered.map(game => ({ name: game.name, value: game.name })),
        );
    }

    static async checkAdminPermissions(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ 
                content: 'You need administrator permissions to use this command.',
                ephemeral: true 
            });
            return false;
        }
        return true;
    }
}

module.exports = CommandHelper;
