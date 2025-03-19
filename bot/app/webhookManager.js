const { WebhookClient } = require('discord.js');
const logger = require('@shared/logger');
const axios = require('axios');

/**
 * Fetches an image from URL and converts it to base64
 * @param {string} url - URL of the image
 * @returns {Promise<string>} Base64 string with data URI prefix
 */
async function getBase64FromUrl(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
        logger.error(`Failed to fetch avatar image: ${error.message}`);
        return null;
    }
}

/**
 * Creates a webhook with platform-specific error handling
 * @param {TextChannel} channel - The Discord.js channel to create a webhook in
 * @param {Object} options - Options for the webhook
 * @returns {Promise<Webhook>} The created webhook
 */
async function createWebhook(channel, options) {
    try {
        logger.debug(`Creating webhook in channel ${channel.id} with name ${options.name}`);
        
        // Check environment
        const isLinux = process.platform === 'linux';
        logger.debug(`Platform: ${process.platform}, Node.js: ${process.version}`);
        
        let webhook;
        
        if (isLinux) {
            // On Linux, use a more careful approach with explicit error handling
            try {
                // First attempt - standard approach
                webhook = await channel.createWebhook(options);
            } catch (error) {
                logger.warn(`Standard webhook creation failed on Linux: ${error.message}`);
                
                // Fall back to REST API approach for Linux systems
                try {
                    logger.debug('Attempting fallback webhook creation via REST API');
                    const client = channel.client;
                    
                    // Build request body
                    const body = { name: options.name };
                    
                    // Handle avatar properly - convert URL to base64 data URI if needed
                    if (options.avatar) {
                        logger.debug('Processing avatar for REST API webhook creation');
                        // Check if options.avatar is a URL or already base64
                        if (typeof options.avatar === 'string' && (options.avatar.startsWith('http://') || options.avatar.startsWith('https://'))) {
                            // It's a URL, fetch and convert to base64
                            logger.debug(`Converting avatar URL to base64: ${options.avatar}`);
                            body.avatar = await getBase64FromUrl(options.avatar);
                            if (!body.avatar) {
                                logger.warn('Failed to convert avatar URL to base64, creating webhook without avatar');
                            } else {
                                logger.debug('Successfully converted avatar to base64');
                            }
                        } else {
                            // Assume it's already in correct format
                            body.avatar = options.avatar;
                        }
                    } else {
                        logger.debug('No avatar provided for webhook');
                    }
                    
                    logger.debug(`Making REST API request to create webhook with name: ${body.name}`);
                    const response = await client.rest.post(`/channels/${channel.id}/webhooks`, {
                        body,
                        reason: options.reason
                    });
                    
                    webhook = {
                        id: response.id,
                        url: `https://discord.com/api/webhooks/${response.id}/${response.token}`,
                        token: response.token
                    };
                    
                    logger.info(`Successfully created webhook via REST API: ${webhook.id}`);
                } catch (restError) {
                    logger.error(`REST API webhook creation failed: ${restError.message}`);
                    throw restError;
                }
            }
        } else {
            // On Windows/other platforms, use standard approach
            webhook = await channel.createWebhook(options);
        }
        
        logger.info(`Webhook created successfully with ID: ${webhook.id}`);
        return webhook;
    } catch (error) {
        logger.error(`Failed to create webhook: ${error.message}, Code: ${error.code || 'None'}`);
        if (error.cause) {
            logger.error(`Caused by: ${error.cause.message}, Code: ${error.cause.code || 'None'}`);
        }
        throw error;
    }
}

module.exports = { createWebhook };
