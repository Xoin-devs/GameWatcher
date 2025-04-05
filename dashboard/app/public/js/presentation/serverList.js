/**
 * Component for displaying and managing the server list
 */
class ServerList {
    /**
     * Initialize the component
     * @param {NodeList} serverItems - Server list items
     * @param {Function} onServerSelect - Callback for server selection
     * @param {Function} onMobileServerSelect - Callback for mobile view server selection
     */
    constructor(serverItems, onServerSelect, onMobileServerSelect = null) {
        this.serverItems = serverItems;
        this.onServerSelect = onServerSelect;
        this.onMobileServerSelect = onMobileServerSelect;
        this.setupEventHandlers();
    }
    
    /**
     * Setup event handlers for server selection
     */
    setupEventHandlers() {
        this.serverItems.forEach(item => {
            // Click handler
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectServer(item);
            });
            
            // Keyboard handler for accessibility
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectServer(item);
                }
            });
        });
    }
    
    /**
     * Handle server selection
     * @param {HTMLElement} serverItem - The selected server element
     */
    selectServer(serverItem) {
        // Get the guild ID as string to avoid BigInt issues
        const guildId = String(serverItem.getAttribute('data-guild-id'));
        
        // Update UI
        this.serverItems.forEach(item => item.classList.remove('active'));
        serverItem.classList.add('active');
        
        // Notify parent component
        if (this.onServerSelect) {
            this.onServerSelect(guildId);
        }
        
        // On mobile, let the parent handle the scrolling
        if (window.innerWidth <= 768 && this.onMobileServerSelect) {
            this.onMobileServerSelect();
        }
    }
    
    /**
     * Add touch feedback for mobile devices
     */
    addTouchFeedback() {
        this.serverItems.forEach(el => {
            // Touch start - add active class
            el.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            }, { passive: true });
            
            // Touch end/cancel - remove active class
            ['touchend', 'touchcancel'].forEach(eventType => {
                el.addEventListener(eventType, function() {
                    this.classList.remove('touch-active');
                }, { passive: true });
            });
        });
    }
}

export default ServerList;