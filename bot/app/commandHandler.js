const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const client = require('./client');
const logger = require('@shared/logger');

function initCommandsLocally() {
    client.commands = new Collection();
    client.cooldowns = new Collection();

    registerCommandsLocally();
    registerEventsHandling();
}

function registerCommandsLocally() {
    const commandFolders = ['commands_private', 'commands_public'];

    for (const folder of commandFolders) {
        const foldersPath = path.join(__dirname, folder);
        const commandSubFolders = fs.readdirSync(foldersPath);

        for (const subFolder of commandSubFolders) {
            const commandsPath = path.join(foldersPath, subFolder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                } else {
                    logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    }
}

function registerEventsHandling() {
    const eventsPath = path.join(__dirname, 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
    }
}

module.exports = { initCommandsLocally };