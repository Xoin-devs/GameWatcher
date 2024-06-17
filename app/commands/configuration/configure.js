const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder, ButtonStyle, ButtonBuilder } = require('discord.js');
const { readConfig } = require('../../config');
const CustomIds = require('../../constants/customIds');
const CommandsName = require('../../constants/commandsName');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.CONFIGURE)
        .setDescription('Configure the bot'),
    async execute(interaction) {
        const games = readConfig().games;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(CustomIds.GAME_SELECT_MENU)
            .setPlaceholder('Select a game to configure')
            .addOptions(
                games.map(game =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(game.name)
                        .setValue(game.name)
                )
            );

        const addButton = new ButtonBuilder()
            .setCustomId(CustomIds.ADD_GAME_BUTTON)
            .setLabel('Add a game')
            .setStyle(ButtonStyle.Primary);

        const removeButton = new ButtonBuilder()
            .setCustomId(CustomIds.REMOVE_GAME_BUTTON)
            .setLabel('Remove a game')
            .setStyle(ButtonStyle.Danger);

        const actionRowSelection = new ActionRowBuilder()
            .addComponents(selectMenu);

        const actionRowButton = new ActionRowBuilder()
            .addComponents(addButton, removeButton);

        await interaction.reply({ content: 'Select a game to configure, add a new game or remove a game.', components: [actionRowSelection, actionRowButton] });
    },
};