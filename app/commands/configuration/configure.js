const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
const { readConfig } = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configure')
        .setDescription('Configure the bot'),
    async execute(interaction) {
        const games = readConfig().games;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('game_select_menu')
            .setPlaceholder('Select a game to configure')
            .addOptions(
                games.map(game =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(game.name)
                        .setValue(game.name)
                )
            );

        const addButton = new ButtonBuilder()
            .setCustomId('add_game')
            .setLabel('Add a game')
            .setStyle(ButtonStyle.Primary);

        const removeButton = new ButtonBuilder()
            .setCustomId('remove_game')
            .setLabel('Remove a game')
            .setStyle(ButtonStyle.Danger);

        const actionRowSelection = new ActionRowBuilder()
            .addComponents(selectMenu);

        const actionRowButton = new ActionRowBuilder()
            .addComponents(addButton, removeButton);

        await interaction.reply({ content: 'Select a game to configure, add a new game or remove a game.', components: [actionRowSelection, actionRowButton] });
    },
};