const client = require('./client');
const { token } = require('./config');
const { initCommandsLocally } = require('./commandHandler');
const logger = require('./logger');

logger.info('Starting the application...');
initCommandsLocally();

client.login(token);