// filepath: i:\_workspace_fourtou\Discord\GameWatcher\bot\app\commands_private\configuration\addGame.js
const { SlashCommandBuilder } = require('discord.js');
const CommandsName = require('@bot/constants/commandsName');
const CommandsOption = require('@bot/constants/commandsOption');
const SourceType = require('@bot/constants/sourceType');
const Utils = require('@bot/utils');
const logger = require('@shared/logger');
const ReleaseManager = require('@bot/releaseManager');
const gameSourceService = require('@bot/services/gameSourceService');
const gameDatabaseService = require('@bot/services/gameDatabaseService');
const gameSourceEnricher = require('@bot/services/gameSourceEnricher');

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.ADD_GAME)
        .setDescription('Add a new game to the list')
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName(CommandsOption.STEAM)
                .setDescription('Steam URL')
                .setRequired(true)),

    /**
     * Execute the add game command
     * @param {Object} interaction - Discord interaction
     */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });
        
        try {
            // Log command execution
            logger.info(`Add game command executed by user ${interaction.user.tag} (${interaction.user.id}) in guild ${interaction.guild.name} (${interaction.guildId})`);
            
            // Validate inputs
            const { isValid, twitterUrl, steamUrl } = this.validateInputs(interaction);
            if (!isValid) return;
            
            // OPTIMIZATION: First check if game already exists in database by sources
            await interaction.editReply({ content: '🔍 Checking for existing game sources...' });
            
            // Process game sources, efficiently using existing data when possible
            const { gameName, gameDetails, existingGame } = await this.processGameSources(
                interaction, twitterUrl, steamUrl
            );
            
            if (!gameName) return;
            
            // Sanitize game name
            const sanitizedGameName = gameSourceService.sanitizeGameName(gameName);
            
            // Handle game in database (create new or update existing)
            await this.handleGameInDatabase(interaction, sanitizedGameName, gameDetails, existingGame);
            
        } catch (error) {
            await this.handleError(interaction, error);
        }
    },

    /**
     * Validate command inputs
     * @param {Object} interaction - Discord interaction
     * @returns {Object} - Validation result with URLs
     */
    validateInputs(interaction) {
        const twitterUrl = ""; // interaction.options.getString(CommandsOption.TWITTER)?.trim();
        const steamUrl = interaction.options.getString(CommandsOption.STEAM)?.trim();
        
        // Check if at least one URL is provided
        if (!twitterUrl && !steamUrl) {
            interaction.editReply({
                content: '❌ You must provide at least one URL (Steam or Twitter)',
                ephemeral: true
            });
            return { isValid: false };
        }
        
        return { isValid: true, twitterUrl, steamUrl };
    },

    /**
     * Process game sources to get game information, optimized to check database first
     * @param {Object} interaction - Discord interaction
     * @param {string} twitterUrl - Twitter URL
     * @param {string} steamUrl - Steam URL
     * @returns {Promise<Object>} - Game name, details, and existing game (if found)
     */
    async processGameSources(interaction, twitterUrl, steamUrl) {
        try {
            // First check if the game already exists in our database
            const existingGame = await gameSourceEnricher.findExistingGameBySource(steamUrl, twitterUrl);
            
            if (existingGame) {
                await interaction.editReply({ 
                    content: `🔍 Found existing game "${existingGame.name}" in database. Enriching with new source information...`
                });
            }
            
            // Enrich game details combining existing data with new sources
            const result = await gameSourceEnricher.enrichGameDetails(
                existingGame, steamUrl, twitterUrl, interaction
            );
            
            return result;
            
        } catch (error) {
            await interaction.editReply({
                content: `❌ ${error.message}`,
                ephemeral: true
            });
            return { gameName: null };
        }
    },

    /**
     * Handle game database operations
     * @param {Object} interaction - Discord interaction
     * @param {string} gameName - Sanitized game name
     * @param {Object} gameDetails - Game details from sources
     * @param {Object|null} existingGame - Existing game if found in database
     * @returns {Promise<void>}
     */
    async handleGameInDatabase(interaction, gameName, gameDetails, existingGame) {
        const guildId = interaction.guildId;
        
        // If we found an existing game by source, we should check if this guild is subscribed
        if (existingGame) {
            await interaction.editReply({
                content: `🔍 Checking subscription status for "${existingGame.name}"...`
            });
            
            const isSubscribed = await gameDatabaseService.isGuildSubscribed(guildId, existingGame.id);
            
            // If already subscribed, tell the user
            if (isSubscribed) {
                await interaction.editReply({
                    content: `✅ This guild is already subscribed to **"${existingGame.name}"**`
                });
                return;
            }
            
            // If not subscribed, subscribe the guild and add any new sources
            try {
                const message = await this.updateExistingGameAndSubscribe(
                    guildId, existingGame, gameDetails
                );
                
                await interaction.editReply({ content: message });
                return;
            } catch (error) {
                throw new Error(`Error updating game: ${error.message || 'Unknown error'}`);
            }
        }
        
        // If we reach here, we need to check by name or create a new game
        await interaction.editReply({
            content: `🔍 Checking if "${gameName}" exists by name...`
        });
        
        const { exists, subscribed, gameId } = 
            await gameDatabaseService.checkGameAndSubscription(guildId, gameName);
        
        // Case 1: Game exists by name and guild is already subscribed
        if (exists && subscribed) {
            await interaction.editReply({
                content: `✅ This guild is already subscribed to **"${gameName}"**`
            });
            return;
        }
        
        // Case 2: Game exists by name but guild is not subscribed
        if (exists) {
            try {
                await gameDatabaseService.subscribeGuildToGame(guildId, gameId);
                await interaction.editReply({
                    content: `✅ Game **"${gameName}"** already exists and has been added to this guild's subscription list!`
                });
                return;
            } catch (error) {
                throw new Error(`Error subscribing to game: ${error.message || 'Unknown error'}`);
            }
        }
        
        // Case 3: Game doesn't exist - create new game
        await interaction.editReply({
            content: `⏱️ Creating new game entry for **"${gameName}"**...`
        });
        
        // Build the game object
        const gameObject = Utils.buildGameObject(gameName, gameDetails);
        logger.debug(`Adding game with details:`, {
            name: gameName,
            sources: gameObject.sources,
            releaseDate: gameObject.releaseDate
        });
        
        try {
            // Add game and subscribe guild in one operation
            const { game: newGame } = await gameDatabaseService.createGameWithSubscription(
                gameName, gameObject, guildId
            );
            
            // Set up release monitoring
            ReleaseManager.getInstance().addOrUpdateCronJob(newGame);
            
            // Format success message
            let successMessage = `✅ Game **"${gameName}"** added successfully and subscribed to this guild!`;
            
            if (gameObject.releaseDate) {
                const humanReadableDate = Utils.formatHumanReadableDate(gameObject.releaseDate);
                successMessage += `\n📅 Release Date: **${humanReadableDate}**`;
            }
            
            await interaction.editReply({ content: successMessage });
            
        } catch (error) {
            throw new Error(`Failed to add game to database: ${error.message || 'Unknown database error'}`);
        }
    },
    
    /**
     * Update an existing game with new sources and subscribe the guild
     * @param {string} guildId - Discord guild ID
     * @param {Object} existingGame - Existing game object
     * @param {Object} newDetails - New game details
     * @returns {Promise<string>} - Success message
     */
    async updateExistingGameAndSubscribe(guildId, existingGame, newDetails) {
        // Build updated game object by merging existing data with new sources
        const updatedGameObject = Utils.buildGameObject(
            existingGame.name, 
            newDetails, 
            existingGame
        );
        
        // Update game in database if we have new information
        const db = await gameDatabaseService.getDatabaseInstance();
        let updated = false;
        
        // Update sources if necessary
        if (this.hasNewSources(existingGame, updatedGameObject)) {
            await db.updateGameSources(existingGame.id, updatedGameObject.sources);
            updated = true;
        }
        
        // Update release date if we have a new one and existing is missing
        if (!existingGame.releaseDate && updatedGameObject.releaseDate) {
            await db.updateGameReleaseDate(existingGame.id, updatedGameObject.releaseDate);
            updated = true;
        }
        
        // Subscribe guild to the game
        await gameDatabaseService.subscribeGuildToGame(guildId, existingGame.id);
        
        // Update cron job if game was updated
        if (updated) {
            const refreshedGame = await db.getGame(existingGame.name);
            ReleaseManager.getInstance().addOrUpdateCronJob(refreshedGame);
        }
        
        // Build success message
        let baseMessage = `✅ Game **"${existingGame.name}"** has been added to this guild's subscription list!`;
        
        if (updated) {
            baseMessage += `\n💡 The game information has been enriched with your new sources.`;
        }
        
        // Add release date info if available
        if (updatedGameObject.releaseDate) {
            const humanReadableDate = Utils.formatHumanReadableDate(updatedGameObject.releaseDate);
            baseMessage += `\n📅 Release Date: **${humanReadableDate}**`;
        }
        
        return baseMessage;
    },
    
    /**
     * Check if new game object has sources not in existing game
     * @param {Object} existingGame - Existing game object
     * @param {Object} updatedGame - Updated game object
     * @returns {boolean} - True if has new sources
     */
    hasNewSources(existingGame, updatedGame) {
        const existingSources = existingGame.sources || [];
        const updatedSources = updatedGame.sources || [];
        
        // Quick check - if updated has more sources, it has new ones
        if (updatedSources.length > existingSources.length) {
            return true;
        }
        
        // Check for Steam sources in updated that aren't in existing
        const existingSteamIds = existingSources
            .filter(s => s[SourceType.STEAM_INTERNAL])
            .map(s => s[SourceType.STEAM_INTERNAL]);
            
        const newSteamSources = updatedSources
            .filter(s => s[SourceType.STEAM_INTERNAL])
            .filter(s => !existingSteamIds.includes(s[SourceType.STEAM_INTERNAL]));
            
        if (newSteamSources.length > 0) {
            return true;
        }
        
        // Check for Twitter sources in updated that aren't in existing
        const existingTwitterUrls = existingSources
            .filter(s => s[SourceType.TWITTER])
            .map(s => s[SourceType.TWITTER]);
            
        const newTwitterSources = updatedSources
            .filter(s => s[SourceType.TWITTER])
            .filter(s => !existingTwitterUrls.includes(s[SourceType.TWITTER]));
            
        return newTwitterSources.length > 0;
    },

    /**
     * Handle command errors
     * @param {Object} interaction - Discord interaction
     * @param {Error} error - Error object
     */
    async handleError(interaction, error) {
        const errorMessage = `Failed to register game: ${error.message || 'Unknown error'}`;
        logger.error(`Error in addGame command:`, error);
        
        await interaction.editReply({
            content: `❌ ${errorMessage}`,
            ephemeral: true
        }).catch(e => {
            logger.error('Failed to send error message to user:', e);
        });
    }
};