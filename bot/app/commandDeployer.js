require('module-alias/register');
require('@shared/config');
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('@shared/logger');

const commands = [];
const privateCommands = [];

// Function to load commands from a given directory
const loadCommands = (commandsPath, commandsArray) => {
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commandsArray.push(command.data.toJSON());
		} else {
			logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
};

// Load public commands
const publicFoldersPath = path.join(__dirname, 'commands_public');
const publicCommandFolders = fs.readdirSync(publicFoldersPath);
for (const folder of publicCommandFolders) {
	const commandsPath = path.join(publicFoldersPath, folder);
	loadCommands(commandsPath, commands);
}

// Load private commands
const privateFoldersPath = path.join(__dirname, 'commands_private');
const privateCommandFolders = fs.readdirSync(privateFoldersPath);
for (const folder of privateCommandFolders) {
	const commandsPath = path.join(privateFoldersPath, folder);
	loadCommands(commandsPath, privateCommands);
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy public commands to all guilds
(async () => {
	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands for all guilds.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
			{ body: commands },
		);

		logger.info(`Successfully reloaded ${data.length} application (/) commands for all guilds.`);
	} catch (error) {
		logger.error(error.message);
	}
})();

// Deploy private commands to a specific guild
(async () => {
	try {
		logger.info(`Started refreshing ${privateCommands.length} application (/) commands for guild ${process.env.ADMIN_GUILD_ID}.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.ADMIN_GUILD_ID),
			{ body: privateCommands },
		);

		logger.info(`Successfully reloaded ${data.length} application (/) commands for guild ${process.env.ADMIN_GUILD_ID}.`);
	} catch (error) {
		logger.error(error.message);
	}
})();