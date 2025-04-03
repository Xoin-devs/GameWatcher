const DashboardViewModel = require('./viewmodels/DashboardViewModel');
const { NotFoundError } = require('../../../core/application/errors/ApplicationErrors');

/**
 * Controller for guild-related web routes
 */
class GuildController {
    /**
     * @param {import('../../../core/domain/ports/in/GuildPort')} guildService 
     * @param {import('../../../core/domain/ports/in/UserPort')} userService
     */
    constructor(guildService, userService) {
        this.guildService = guildService;
        this.userService = userService;
    }

    /**
     * Get all guilds
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    async getAllGuilds(req, res, next) {
        try {
            const guilds = await this.guildService.getGuilds();
            res.json(guilds);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get details for a specific guild
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    async getGuildDetails(req, res, next) {
        try {
            const { guildId } = req.params;
            
            if (!guildId) {
                throw new NotFoundError('Guild ID is required');
            }
            
            const guildDetails = await this.guildService.getGuildDetails(guildId);
            
            if (!guildDetails) {
                throw new NotFoundError(`Guild with ID ${guildId} not found`);
            }
            
            res.json(guildDetails);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Render dashboard view with user's accessible guilds
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    async renderDashboard(req, res, next) {
        try {
            if (!req.user) {
                return res.redirect('/login');
            }

            const userWithGuilds = await this.userService.getUserProfile(req.user);
            
            if (!userWithGuilds || !userWithGuilds.guilds) {
                throw new Error('Failed to load guilds');
            }
            
            // Get bot guilds to compare
            const botGuilds = await this.guildService.getGuilds();
            
            // Filter guilds to only show ones where the user has admin permissions
            const adminGuilds = userWithGuilds.guilds.filter(guild => guild.hasAdminPermission());
            
            // Filter to only include guilds where the bot is also present
            const managedGuilds = adminGuilds.filter(guild => 
                botGuilds.some(botGuild => botGuild.id === guild.id)
            );
            
            // Create view model for the dashboard with only managed guilds
            const viewModel = new DashboardViewModel(req.user, managedGuilds);
            
            // Render the dashboard with the view model
            res.render('dashboard', viewModel.toViewModel());
        } catch (error) {
            next(error);
        }
    }
}

module.exports = GuildController;