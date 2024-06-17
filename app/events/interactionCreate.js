const { Events } = require('discord.js');
const CustomIds = require('../constants/customIds');

// #region Slash Command Handling
async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    await executeSlashCommand(interaction, command);
}

async function executeSlashCommand(interaction, command) {
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
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

// #region Button Handling
async function handleButton(interaction) {
    const { customId } = interaction.component;

    switch (customId) {
        case CustomIds.ADD_GAME_BUTTON:
            // handle add game button click
            break;
        case CustomIds.REMOVE_GAME_BUTTON:
            // handle remove game button click
            break;
        default:
            console.error(`No handler for button with customId ${customId}`);
    }
}
// #endregion

// #region Select Menu Handling
async function handleSelectMenu(interaction) {
    const { customId, values } = interaction.component;

    switch (customId) {
        case CustomIds.GAME_SELECT_MENU:
            // handle game selection
            // values is an array of selected option values
            const selectedGame = values[0];
            console.log(`Selected game: ${selectedGame}`);
            break;
        default:
            console.error(`No handler for select menu with customId ${customId}`);
    }
}
// #endregion

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            await handleSlashCommand(interaction);
        } else if (interaction.isButton()) {
            await handleButton(interaction);
        } else if (interaction.isStringSelectMenu()) {
            await handleSelectMenu(interaction);
        }
    },
};