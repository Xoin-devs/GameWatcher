/**
 * Represents pagination information in the domain
 */
class Pagination {
    /**
     * @param {number} total - Total number of items
     * @param {number} page - Current page number
     * @param {number} limit - Items per page
     */
    constructor(total, page = 1, limit = 20) {
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(total / limit);
    }

    /**
     * Check if there's a previous page
     * @returns {boolean} Whether there is a previous page
     */
    hasPreviousPage() {
        return this.page > 1;
    }

    /**
     * Check if there's a next page
     * @returns {boolean} Whether there is a next page
     */
    hasNextPage() {
        return this.page < this.totalPages;
    }

    /**
     * Get previous page number
     * @returns {number} Previous page number or current page if no previous page
     */
    getPreviousPage() {
        return this.hasPreviousPage() ? this.page - 1 : this.page;
    }

    /**
     * Get next page number
     * @returns {number} Next page number or current page if no next page
     */
    getNextPage() {
        return this.hasNextPage() ? this.page + 1 : this.page;
    }

    /**
     * Get array of page numbers for pagination UI
     * @param {number} maxButtons - Maximum number of page buttons to show
     * @returns {number[]} Array of page numbers
     */
    getPageNumbers(maxButtons = 5) {
        if (this.totalPages <= maxButtons) {
            return Array.from({ length: this.totalPages }, (_, i) => i + 1);
        }

        // Always include first, last, and current page
        const pages = [1, this.page, this.totalPages];
        
        // Add pages before and after current
        const beforeCurrent = this.page - 1;
        const afterCurrent = this.page + 1;
        
        if (beforeCurrent > 1) pages.push(beforeCurrent);
        if (afterCurrent < this.totalPages) pages.push(afterCurrent);
        
        // Sort and remove duplicates
        return [...new Set(pages)].sort((a, b) => a - b);
    }
}

module.exports = Pagination;