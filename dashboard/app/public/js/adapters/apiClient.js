/**
 * API client for communicating with the backend
 * Acts as an adapter between the frontend and backend
 */
class ApiClient {
    /**
     * Initialize the API client
     */
    constructor() {
        // Base URL for API requests, empty string means same origin
        this.baseUrl = '';
    }

    /**
     * Generic method to make API requests
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<any>} - Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API request error for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get guild game statistics
     * @param {string} guildId - Guild ID
     * @returns {Promise<Object>} - Game statistics
     */
    async getGuildStats(guildId) {
        return this.request(`/api/guilds/${guildId}/stats`);
    }

    /**
     * Get guild games with pagination, search and filtering
     * @param {string} guildId - Guild ID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {string} search - Search term
     * @param {string} filter - Filter criteria
     * @returns {Promise<Object>} - Games with pagination info
     */
    async getGuildGames(guildId, page = 1, limit = 20, search = '', filter = '') {
        let url = `/api/guilds/${guildId}/games?page=${page}&limit=${limit}`;
        
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        
        if (filter) {
            url += `&filter=${encodeURIComponent(filter)}`;
        }
        
        return this.request(url);
    }

    /**
     * Toggle game subscription
     * @param {string} guildId - Guild ID
     * @param {string} gameId - Game ID
     * @param {boolean} subscribe - Whether to subscribe or unsubscribe
     * @returns {Promise<Object>} - Success response
     */
    async toggleGameSubscription(guildId, gameId, subscribe) {
        return this.request(`/api/guilds/${guildId}/games/${gameId}/toggle`, {
            method: 'POST',
            body: JSON.stringify({ subscribe })
        });
    }
}

// Export as singleton
const apiClient = new ApiClient();
export default apiClient;