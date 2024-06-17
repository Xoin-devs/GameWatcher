const { Events } = require('discord.js');
const CustomIds = require('../constants/customIds');
const logger = require('../logger');

const addGameButtonHandler = require('../handlers/addGame');
const removeGameButtonHandler = require('../handlers/removeGame');
const gameSelectMenuHandler = require('../handlers/gameSelect');

const customIdHandlers = {
    [CustomIds.ADD_GAME_BUTTON]: addGameButtonHandler,
    [CustomIds.REMOVE_GAME_BUTTON]: removeGameButtonHandler,
    [CustomIds.GAME_SELECT_MENU]: gameSelectMenuHandler,
    // add other handlers here
};

// #region Slash Command Handling
async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    await executeSlashCommand(interaction, command);
}

async function executeSlashCommand(interaction, command) {
    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(`Error executing command ${interaction.commandName}: ${error.message}`);
        await handleCommandError(interaction);
    }
}

async function handleCommandError(interaction) {
    const errorMessage = 'There was an error while executing this command!';
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
    }
}
// #endregion

// #region Button and Menu Handling
async function handleButtonOrMenu(interaction) {
    const handler = customIdHandlers[interaction.customId];
    if (handler) {
        await handler(interaction);
    } else {
        logger.error(`No handler for customId ${interaction.customId}`);
    }
}
// #endregion

// #region AutoComplete Handling
async function handleAutoComplete(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.autocomplete(interaction);
    }
    catch (error) {
        logger.error(`Error executing autocomplete for command ${interaction.commandName}: ${error.message}`);
    }
}
// #endregion

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
        } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
            await handleButtonOrMenu(interaction);
        } else if (interaction.isAutocomplete()) {
            await handleAutoComplete(interaction);
        }
    },
};