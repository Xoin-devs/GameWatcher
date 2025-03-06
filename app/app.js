require('./config');
const client = require('./client');
const { initCommandsLocally } = require('./commandHandler');
const logger = require('./logger');

logger.info('Starting the application...');
initCommandsLocally();

client.login(process.env.DISCORD_TOKEN);