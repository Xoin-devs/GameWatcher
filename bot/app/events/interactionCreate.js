const { Events, Collection } = require('discord.js');
const logger = require('../logger');

// #region SlashCommand Handling
async function handleSlashCommand(interaction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    const { cooldowns } = interaction.client;

    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const defaultCooldownDuration = 8;
    const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
            const expiredTimestamp = Math.round(expirationTime / 1_000);
            return interaction.reply({ content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`, ephemeral: true });
        }
    }
    
	timestamps.set(interaction.user.id, now);
	setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

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
    // TODO Implement button and menu handling if needed
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
    } catch (error) {
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