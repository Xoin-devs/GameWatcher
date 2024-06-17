const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('../../constants/commandsName');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.USER)
        .setDescription('Provides information about the user.'),
    async execute(interaction) {
        await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
    },
};