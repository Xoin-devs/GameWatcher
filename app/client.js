const Discord = require('discord.js');

const Intents = new Discord.IntentsBitField().add(
    Discord.IntentsBitField.Flags.GuildMessages,
    Discord.IntentsBitField.Flags.Guilds,
    Discord.IntentsBitField.Flags.GuildPresences,
    Discord.IntentsBitField.Flags.MessageContent
);

const client = new Discord.Client({ intents: Intents });

module.exports = client;