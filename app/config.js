const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');

const env = process.env.NODE_ENV || 'dev';
const result = dotenv.config({ path: path.join(__dirname, "..", `.env.${env}`) });
if (result.error) {
    throw result.error;
}

const configPath = path.join(__dirname, '..', `config.${env}.json`);

const configSchema = Joi.object({
    guilds: Joi.array().items(
        Joi.object({
            guildId: Joi.string().required(),
            channelId: Joi.string().required(),
        })
    ),
    games: Joi.array().items(
        Joi.object({
            name: Joi.string().required(),
            sources: Joi.array().items(
                Joi.object().pattern(
                    Joi.string(),
                    Joi.string()
                ).unknown(),
            ).optional(),
            releaseDate: Joi.date().optional(),
        })
    ),
});

function readConfig() {
    if (!fs.existsSync(configPath)) {
        return { guilds: [], games: [] };
    }

    const rawConfig = fs.readFileSync(configPath);
    const parsedConfig = JSON.parse(rawConfig);

    parsedConfig.games.forEach(game => {
        if (game.releaseDate) {
            const date = new Date(game.releaseDate);
            if (isNaN(date.getTime())) {
                delete game.releaseDate;
            } else {
                game.releaseDate = date;
            }
        }
    });

    const { value: config, error } = configSchema.validate(parsedConfig);
    if (error) {
        throw new Error(`Invalid config: ${error.message}`);
    }

    return config;
}

function writeConfig(config) {
    const configToWrite = { ...config };

    configToWrite.games.forEach(game => {
        if (game.releaseDate) {
            game.releaseDate = game.releaseDate.toISOString().split('T')[0];
        }
    });

    const { error } = configSchema.validate(configToWrite);
    if (error) {
        throw new Error([`Invalid config: ${error.message}`]);
    }
    
    fs.writeFileSync(configPath, JSON.stringify(configToWrite, null, 2));
}

module.exports = {
    token: process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    readConfig,
    writeConfig
};