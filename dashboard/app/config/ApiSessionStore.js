/**
 * Custom session store that communicates with the API
 */
const session = require('express-session');
const logger = require('@shared/logger');
const config = require('@shared/config');
// Use axios instead of node-fetch
const axios = require('axios');

// Use a consistent API URL based on environment
const getApiBaseUrl = () => {
    const api_port = process.env.API_PORT || 8080;
    const api_endpoint = process.env.API_ENDPOINT || 'http://localhost';
    
    // For production with custom domain, don't add port to the URL
    if (api_endpoint.includes('https://') && !api_endpoint.includes('localhost')) {
        return api_endpoint;
    }
    
    return `${api_endpoint}:${api_port}`;
};

class ApiSessionStore extends session.Store {
    constructor(options = {}) {
        super();
        this.apiBaseUrl = options.apiBaseUrl || getApiBaseUrl();
        this.ttl = options.ttl || 86400000; // Default: 1 day
        this.requestTimeout = options.requestTimeout || 5000; // Default: 5 seconds
        this.retryLimit = options.retryLimit || 3; // Default: 3 retries
        
        // Add caching to reduce API calls
        this.cache = new Map();
        this.cacheTTL = options.cacheTTL || 60000; // Default: 1 minute cache
        
        // Add in-flight request tracking to prevent duplicate simultaneous requests
        this.pendingRequests = new Map();
        
        logger.info(`API Session Store initialized with endpoint: ${this.apiBaseUrl} (cache TTL: ${this.cacheTTL}ms)`);
        
        // Set up session cleanup interval if enabled
        if (options.cleanupInterval) {
            this.cleanupInterval = setInterval(() => this.clearExpiredSessions(), options.cleanupInterval);
            this.cleanupInterval.unref(); // Don't keep the process alive just for cleanup
        }
        
        // Set up cache cleanup interval
        const cacheCleanupInterval = options.cacheCleanupInterval || 300000; // Default: 5 minutes
        this.cacheCleanupInterval = setInterval(() => this.clearExpiredCache(), cacheCleanupInterval);
        this.cacheCleanupInterval.unref(); // Don't keep the process alive just for cleanup
    }
    
    /**
     * Clears expired items from the cache
     */
    clearExpiredCache() {
        const now = Date.now();
        let count = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (value.expires <= now) {
                this.cache.delete(key);
                count++;
            }
        }
        
        if (count > 0) {
            logger.debug(`Cleared ${count} expired items from session cache`);
        }
    }
    
    /**
     * Adds an item to the cache
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttl - Time to live in milliseconds (optional)
     */
    setCache(key, value, ttl = this.cacheTTL) {
        this.cache.set(key, {
            data: value,
            expires: Date.now() + ttl
        });
    }
    
    /**
     * Gets an item from the cache
     * @param {string} key - Cache key
     * @returns {*} Cached value or undefined if not found or expired
     */
    getCache(key) {
        const cached = this.cache.get(key);
        
        if (!cached) {
            return undefined;
        }
        
        if (cached.expires <= Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        
        return cached.data;
    }
    
    /**
     * Deletes an item from the cache
     * @param {string} key - Cache key
     */
    deleteCache(key) {
        this.cache.delete(key);
    }
      /**
     * Fetch wrapper with retries and error handling
     * @param {string} url - URL to fetch
     * @param {Object} options - Axios request options
     * @param {boolean} allow404 - Whether to treat 404 as a valid response instead of an error
     * @returns {Promise<{ok: boolean, status: number, data: Object|null}>} Response result
     */
    async fetchWithRetry(url, options, allow404 = false) {
        let attempts = 0;
        let lastError;
        
        while (attempts < this.retryLimit) {
            try {
                // Convert fetch-style options to axios format
                const axiosOptions = {
                    url,
                    method: options.method || 'GET',
                    timeout: this.requestTimeout,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    validateStatus: status => {
                        // If allow404 is true, treat 404 as a successful response
                        if (allow404 && status === 404) {
                            return true;
                        }
                        return status >= 200 && status < 300;
                    }
                };
                
                // Handle request body for POST/PUT requests
                if (options.body) {
                    axiosOptions.data = JSON.parse(options.body);
                }
                
                const response = await axios(axiosOptions);
                
                // Special case for 404 when allowed
                if (allow404 && response.status === 404) {
                    return {
                        ok: true,
                        status: 404,
                        data: null
                    };
                }
                
                return {
                    ok: true,
                    status: response.status,
                    data: response.data
                };
            } catch (error) {
                lastError = error;
                attempts++;
                
                const errorMessage = error.response 
                    ? `API responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`
                    : error.message;
                    
                logger.warn(`API session store fetch failed (attempt ${attempts}): ${errorMessage}`);
                
                // Only retry on network errors, not HTTP errors
                if (!error.response) {
                    await new Promise(resolve => setTimeout(resolve, 500 * attempts));
                } else {
                    break;
                }
            }
        }
        
        throw lastError || new Error('Failed to connect to API');
    }
      /**
     * Get session data
     * @param {string} sessionId - Session ID
     * @param {Function} callback - Callback function(error, session)
     * @returns {void}
     */
    get(sessionId, callback) {
        // Check cache first
        const cachedSession = this.getCache(sessionId);
        if (cachedSession) {
            logger.debug(`Cache hit for session: ${sessionId}`);
            return callback(null, cachedSession);
        }
        
        // Check if there's already a request in progress for this session ID
        if (this.pendingRequests.has(sessionId)) {
            // Add this callback to the pending request's callbacks
            const pendingRequest = this.pendingRequests.get(sessionId);
            pendingRequest.callbacks.push(callback);
            logger.debug(`Added callback to pending request for session: ${sessionId}`);
            return;
        }
        
        // Create new pending request entry with initial callback
        this.pendingRequests.set(sessionId, {
            callbacks: [callback],
            timestamp: Date.now()
        });
        
        // Pass true as the third parameter to allow 404 responses
        this.fetchWithRetry(`${this.apiBaseUrl}/api/sessions/${sessionId}`, {
            method: 'GET'
        }, true)
        .then(response => {
            // Get all callbacks waiting for this session
            const { callbacks } = this.pendingRequests.get(sessionId) || { callbacks: [] };
            // Remove from pending requests
            this.pendingRequests.delete(sessionId);
            
            // If we got a 404, just return null (no session found)
            if (response.status === 404 || !response.data) {
                logger.debug(`Session not found: ${sessionId}`);
                // Call all callbacks with null session
                callbacks.forEach(cb => cb(null, null));
                return;
            }
            
            // Otherwise process the successful response
            if (response.ok && response.data.success && response.data.data) {
                try {
                    // API returns session data as a string, need to parse it
                    const sessionData = JSON.parse(response.data.data.data);
                    // Cache the session data
                    this.setCache(sessionId, sessionData);
                    // Call all callbacks with the session data
                    callbacks.forEach(cb => cb(null, sessionData));
                } catch (error) {
                    logger.error(`Failed to parse session data: ${error.message}`);
                    // Call all callbacks with the error
                    callbacks.forEach(cb => cb(error));
                }
            } else {
                // Session not found or invalid data
                callbacks.forEach(cb => cb(null, null));
            }
        })
        .catch(error => {
            // Get all callbacks waiting for this session
            const { callbacks } = this.pendingRequests.get(sessionId) || { callbacks: [] };
            // Remove from pending requests
            this.pendingRequests.delete(sessionId);
            
            // Only true errors should reach here now (not 404)
            logger.error(`Error retrieving session ${sessionId}: ${error.message}`);
            // Call all callbacks with the error
            callbacks.forEach(cb => cb(error));
        });
    }
    
    /**
     * Set session data
     * @param {string} sessionId - Session ID
     * @param {Object} session - Session data
     * @param {Function} callback - Callback function(error)
     * @returns {void}
     */
    set(sessionId, session, callback) {
        const maxAge = session.cookie && typeof session.cookie.maxAge === 'number'
            ? session.cookie.maxAge
            : this.ttl;
            
        this.fetchWithRetry(`${this.apiBaseUrl}/api/sessions/${sessionId}`, {
            method: 'POST',
            body: JSON.stringify({
                data: JSON.stringify(session),
                maxAge
            })
        })
        .then(() => {
            // Cache the session data
            this.setCache(sessionId, session);
            callback && callback();
        })
        .catch(error => {
            logger.error(`Error saving session ${sessionId}: ${error.message}`);
            callback && callback(error);
        });
    }
    
    /**
     * Destroy a session
     * @param {string} sessionId - Session ID
     * @param {Function} callback - Callback function(error)
     * @returns {void}
     */
    destroy(sessionId, callback) {
        this.fetchWithRetry(`${this.apiBaseUrl}/api/sessions/${sessionId}`, {
            method: 'DELETE'
        })
        .then(() => {
            // Remove from cache
            this.deleteCache(sessionId);
            callback && callback();
        })
        .catch(error => {
            logger.error(`Error destroying session ${sessionId}: ${error.message}`);
            callback && callback(error);
        });
    }
    
    /**
     * Clear all expired sessions
     * @param {Function} [callback] - Optional callback function(error)
     * @returns {void}
     */
    clearExpiredSessions(callback) {
        this.fetchWithRetry(`${this.apiBaseUrl}/api/sessions/clear-expired`, {
            method: 'POST'
        })
        .then(response => {
            logger.debug(`Cleared ${response.data.count} expired sessions`);
            callback && callback(null, response.data.count);
        })
        .catch(error => {
            logger.error(`Error clearing expired sessions: ${error.message}`);
            callback && callback(error);
        });
    }
}

module.exports = ApiSessionStore;
