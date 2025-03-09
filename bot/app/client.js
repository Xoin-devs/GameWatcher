const Discord = require('discord.js');

const Intents = new Discord.IntentsBitField().add(
    Discord.IntentsBitField.Flags.Guilds
);

const client = new Discord.Client({ intents: Intents });

module.exports = client;