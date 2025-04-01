const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CommandsName = require('@bot/constants/commandsName');
const logger = require('@shared/logger');
const DatabaseManager = require('@shared/database');
const { version } = require('../../../package.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.INFO)
        .setDescription("Display information about the Game News Forge bot")
        .setDMPermission(true),
    async execute(interaction) {
        try {
            const db = await DatabaseManager.getInstance();
            
            // Gather statistics
            const guilds = await db.getGuilds();
            const games = await db.getGames();
            
            const uptime = formatUptime(process.uptime());
            
            const embed = new EmbedBuilder()
                .setTitle('Game News Forge Bot Information')
                .setColor(0x0099ff)
                .setDescription('A Discord bot that tracks game releases and provides updates from various sources.')
                .addFields(
                    { name: 'Bot Version', value: version || 'Unknown', inline: true },
                    { name: 'Servers', value: `${guilds.length}`, inline: true },
                    { name: 'Games Tracked', value: `${games.length}`, inline: true },
                    { name: 'Uptime', value: uptime, inline: true },
                    { name: 'Bot Creator', value: 'Arnauld Alex', inline: true },
                    { name: 'Contact', value: '[LinkedIn Profile](https://www.linkedin.com/in/arnauld-alex/)', inline: true }
                )
                .setFooter({ text: 'Thanks for using Game News Forge!' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
            logger.info(`User ${interaction.user.tag} requested bot info`);
        } catch (error) {
            logger.error(`Error in info command: ${error.message}`, error);
            await interaction.reply('An error occurred while retrieving bot information. Please try again later.');
        }
    }
};

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
}