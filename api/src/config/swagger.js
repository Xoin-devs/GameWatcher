/**
 * Swagger documentation configuration
 */
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Game News Forge API',
      version: '1.0.0',
      description: 'API for Game News Forge to manage game subscriptions',
      contact: {
        name: 'API Support',
        url: 'https://oslo.ovh'
      }
    },
    servers: [
      {
        url: config.isProd() ? '/api' : `http://localhost:${config.port}/api`,
        description: config.isProd() ? 'Production server' : 'Development server'
      }
    ],
    components: {
      schemas: {
        Guild: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Discord guild ID'
            },
            channel_id: {
              type: 'string',
              description: 'Discord channel ID where notifications will be sent'
            },
            webhook_url: {
              type: 'string',
              description: 'Discord webhook URL'
            }
          }
        },
        Game: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Game ID'
            },
            name: {
              type: 'string',
              description: 'Game name'
            },
            release_date: {
              type: 'string',
              format: 'date',
              description: 'Game release date in YYYY-MM-DD format'
            },
            subscribed: {
              type: 'boolean',
              description: 'Whether the guild is subscribed to this game'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation status',
              example: false
            },
            message: {
              type: 'string',
              description: 'Error message'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code'
            },
            errors: {
              type: 'object',
              description: 'Additional error details'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Operation status',
              example: true
            },
            message: {
              type: 'string',
              description: 'Success message'
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code'
            },
            data: {
              type: 'object',
              description: 'Response data'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;