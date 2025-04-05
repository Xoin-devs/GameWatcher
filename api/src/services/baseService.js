/**
 * Base service class with common functionality for all services
 */
const DatabaseManager = require('@shared/database');
const logger = require('@shared/logger');

class BaseService {
    /**
     * Get a database instance
     * @returns {Promise<DatabaseManager>} Database manager instance
     */
    static async getDatabase() {
        return await DatabaseManager.getInstance();
    }

    /**
     * Execute a service method with error handling
     * @param {Function} serviceMethod - The service method to execute
     * @param {string} operationName - Name of the operation for logging
     * @param {Array} args - Arguments to pass to the service method
     * @returns {Promise<*>} - Result of the service method
     * @throws {Error} - Rethrows any error that occurs
     */
    static async executeMethod(serviceMethod, operationName, ...args) {
        try {
            logger.debug(`Executing service operation: ${operationName}`);
            return await serviceMethod(...args);
        } catch (error) {
            logger.error(`Error in service operation ${operationName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Safely convert value to string, useful for BigInt IDs
     * @param {*} value - Value to convert
     * @returns {string|null} String value or null
     */
    static safelyConvertToString(value) {
        return value === null || value === undefined ? null : String(value);
    }

    /**
     * Validate that an ID is not empty
     * @param {string} id - ID to validate
     * @param {string} name - Name of the ID field
     * @throws {Error} If ID is empty
     */
    static validateId(id, name = 'ID') {
        if (!id) {
            throw new Error(`${name} is required`);
        }
    }
}

module.exports = BaseService;