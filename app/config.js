const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');

dotenv.config();

const configPath = path.join(__dirname, '..', 'config.json');
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
                    Joi.string(), // Any string key
                    Joi.string()  // The value is a string
                ).unknown(), // Allow additional keys
            ).optional(),
            releaseDate: Joi.date().optional(),
        })
    ),
});

function readConfig() {
    if (fs.existsSync(configPath)) {
        const rawConfig = fs.readFileSync(configPath);
        const parsedConfig = JSON.parse(rawConfig);
        parsedConfig.games.forEach(game => {
            if (game.releaseDate) {
                const date = new Date(game.releaseDate);
                if (isNaN(date.getTime())) { // Check if the date is invalid
                    delete game.releaseDate; // Remove the releaseDate property if the date is invalid
                } else {
                    game.releaseDate = date;
                }
            }
        });
        const { value: config, error } = configSchema.validate(parsedConfig);
        if (error) {
            throw new Error([`Invalid config: ${error.message}`]);
        }
        return config;
    } else {
        return {
            guilds: [],
            games: []
        };
    }
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
    twitterConsumerKey: process.env.TWITTER_API_KEY,
    twitterConsumerSecret: process.env.TWITTER_API_KEY_SECRET,
    twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN,
    twitterAccessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
    readConfig,
    writeConfig
};