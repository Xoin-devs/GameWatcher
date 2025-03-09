const app = require('./app');
const logger = require('@shared/logger');

const PORT = process.env.API_PORT || 8473;

app.listen(PORT, () => {
    logger.info(`API server running on port ${PORT}`);
});