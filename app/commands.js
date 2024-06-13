const client = require('./client');
const Discord = require('discord.js');
const { readConfig, writeConfig } = require('./config');
const Scheduler = require('./scheduler');

async function registerCommands() {
    const data = [
        {
            name: 'here',
            description: 'Tell the bot to spread news in this channel',
        },
        {
            name: 'registergame',
            description: 'Register a game and its sources',
            options: [
                {
                    name: 'game',
                    type: 3,
                    description: 'The name of the game',
                    required: true,
                },
                {
                    name: 'sources',
                    type: 3,
                    description: 'The URLs of the sources, separated by commas',
                    required: true,
                },
                {
                    name: 'date',
                    type: 3,
                    description: 'The release date (DD-MM-YYYY)',
                    required: false,
                },
            ],
        },
        {
            name: 'listgames',
            description: 'List all registered games',
            options: [
                {
                    name: 'filter',
                    type: 3,
                    description: 'Filter games by name',
                    required: false,
                },
            ],
        },
        {
            name: 'detailgame',
            description: 'List all sources of a game',
            options: [
                {
                    name: 'game',
                    type: 3,
                    description: 'The name of the game',
                    required: true,
                },
            ],
        },
        {
            name: 'registerrelease',
            description: 'Register a release date for a game',
            options: [
                {
                    name: 'game',
                    type: 3,
                    description: 'The name of the game',
                    required: true,
                },
                {
                    name: 'date',
                    type: 3,
                    description: 'The release date (DD-MM-YYYY)',
                    required: true,
                },
            ],
        },
    ];

    try {
        const commands = await client.application.commands.set(data);
        console.log('Commands registered:');
        commands.forEach(command => {
            console.log(`- ${command.name}: ${command.description}`);
        });
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
}

client.on(Discord.Events.InteractionCreate, async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'here') {
        saveChannelId(interaction);
    } else if (commandName === 'registergame') {
        registerGame(interaction);
    } else if (commandName === 'listgames') {
        listGames(interaction);
    } else if (commandName === 'detailgame') {
        detailGame(interaction);
    } else if (commandName === 'registerrelease') {
        registerRelease(interaction);
    }
});

///////////////////////////
async function saveChannelId(interaction) {
    const channelId = interaction.channel.id;
    const guildId = interaction.guild.id;
    const config = readConfig();

    config.guilds = config.guilds.filter(guild => guild.guildId !== guildId);
    
    config.guilds.push({
        guildId: guildId,
        channelId: channelId,
    });
    
    writeConfig(config);
    console.log(`Saving channel ID: ${channelId}`);
    await interaction.reply('I will spread news in this channel');
}

async function registerGame(interaction) {
    const gameName = interaction.options.getString('game');
    const gameNameParsed = getApproximativeName(gameName);
    const sources = interaction.options.getString('sources').split(',');
    const releaseDate = interaction.options.getString('date');

    const config = readConfig();

    if (config.games.some(g => getApproximativeName(g.name) === gameNameParsed)) {
        await interaction.reply('This game is already registered');
        return;
    }

    const gameObj = {
        name: gameName,
        sources: sources.map(url => ({ url, lastUpdate: '' })),
    };

    if (releaseDate) {
        gameObj.releaseDate = releaseDate;
    }

    config.games.push(gameObj);

    try {
        writeConfig(config);
        console.log(`Registered game: ${gameNameParsed}`);
        await interaction.reply('Game registered');
    } catch (error) {
        console.error(`Failed to register game: ${error.message}`);
        await interaction.reply(`Failed to register game: ${error.message}`);
    }
}

async function listGames(interaction) {
    const filter = interaction.options.getString('filter');
    const config = readConfig();
    let games = config.games;

    if (filter) {
        const lowerCaseFilter = getApproximativeName(filter);
        games = games.filter(game => getApproximativeName(game.name).includes(lowerCaseFilter));
    }

    const gameNames = games.map(game => `${game.name} - (${game.sources.length} sources)`);
    await interaction.reply(gameNames.join(', '));
}

async function detailGame(interaction) {
    const gameName = getApproximativeName(interaction.options.getString('game'));
    const config = readConfig();
    const gameDetail = config.games.find(game => getApproximativeName(game.name).includes(gameName));
    if (!gameDetail) {
        await interaction.reply('Sorry, the game you requested was not found.');
        return;
    }

    const sources = gameDetail.sources.map(source => source.url);
    await interaction.reply(`Here are the sources for the game "${gameDetail.name}":\n${sources.join('\n')}`);
}

async function registerRelease(interaction) {
    try {
        const gameName = interaction.options.getString('game');
        const gameNameParsed = getApproximativeName(gameName);
        
        const dateInput = interaction.options.getString('date');
        const date = parseDate(dateInput);
        
        const config = readConfig();

        let gameConfig = config.games.find(g => getApproximativeName(g.name) === gameNameParsed);
        if (!gameConfig) {
            gameConfig = {
                name: gameName,
                sources: [],
                releaseDate: date
            };
            config.games.push(gameConfig);
        } else {
            gameConfig.releaseDate = date;
            await Scheduler.cancelJobsForGame(gameName);
        }

        writeConfig(config);

        const channelId = interaction.channel.id;
        await Scheduler.scheduleReminders(date, channelId, gameName);

        interaction.reply(`Release date registered for ${gameName}`);
    } catch (error) {
        console.error(`Failed to register release: ${error.message}`);
        interaction.reply(`Failed to register release date for ${gameName}`);
    }
}

///////////////////////////

function getApproximativeName(name) {
    return name.toLowerCase().replace(/\s+/g, '');
}

function parseDate(dateInput) {
    const [day, month, year] = dateInput.split('/');
    return new Date(`${month}/${day}/${year}`);
}

module.exports = {
    registerCommands,
};