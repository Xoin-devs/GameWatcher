const client = require('./client');
const { token } = require('./config');
const { initCommandsLocally } = require('./commandHandler');

initCommandsLocally();

client.login(token);