const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('@bot/constants/commandsName');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.PING)
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        await interaction.reply('Pong!');
    },
};