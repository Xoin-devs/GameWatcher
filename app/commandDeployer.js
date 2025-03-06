// Script from https://discordjs.guide/interactions/registering-slash-commands.html#deploying-commands
// This script will deploy all the commands in your commands directory to your Discord application.
// Standalone script. Do not run this script while your bot is running, as it will not work.

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger');

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// and deploy your commands!
(async () => {
	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands on ${process.env.DISCORD_CLIENT_ID}.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
			{ body: commands },
		);

		logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		logger.error(error);
	}
})();