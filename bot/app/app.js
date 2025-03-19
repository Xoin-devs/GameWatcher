require('dns').setDefaultResultOrder('ipv4first');
require('module-alias/register');
require('@shared/config');
const client = require('@bot/client');
const { initCommandsLocally } = require('@bot/commandHandler');
const logger = require('@shared/logger');

logger.info('Starting the application...');
initCommandsLocally();

client.login(process.env.DISCORD_TOKEN);