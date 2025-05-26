const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CommandHelper = require('@bot/commandHelper');
const CommandsName = require('@bot/constants/commandsName');
const CommandsOption = require('@bot/constants/commandsOption');
const Utils = require('@bot/utils');
const SourceType = require('@bot/constants/sourceType');
const logger = require('@shared/logger');
const DatabaseManager = require('@shared/database');
const gameDatabaseService = require('@bot/services/gameDatabaseService');
const axios = require('axios');

// Set up a Map to track button cooldowns
const buttonCooldowns = new Map();
const COOLDOWN_DURATION = 10000; // 10 seconds cooldown
const COLLECTOR_TIMEOUT = 60000; // 1 minute collector timeout

module.exports = {
    data: new SlashCommandBuilder()
        .setName(CommandsName.GET_GAME)
        .setDescription("Get a registered game's informations")
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName(CommandsOption.NAME)
                .setDescription('Name of the game')
                .setRequired(true)
                .setAutocomplete(true)),
    async autocomplete(interaction) {
        CommandHelper.autoCompleteGameName(interaction);
    },
    async execute(interaction) {
        await interaction.deferReply(); // Defer reply since we might be fetching images
        
        const gameName = interaction.options.getString(CommandsOption.NAME);
        const db = await DatabaseManager.getInstance();
        const game = await db.getGame(gameName);

        if (!game) {
            await interaction.editReply('This game is not registered');
            return;
        }

        // Get the game ID
        const gameRows = await db.getGameId(gameName);
        const gameId = gameRows[0].id;

        // Check if the guild is subscribed to the game
        const isSubscribed = await gameDatabaseService.isGuildSubscribed(interaction.guildId, gameId);

        // Get user's country code for appropriate pricing
        const countryCode = Utils.getCountryCodeFromInteraction(interaction);

        // Create a rich embed for the game
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(game.name)
            .setTimestamp();

        // Add release date if available
        if (game.releaseDate) {
            const formattedDate = Utils.formatHumanReadableDate(game.releaseDate);
            embed.addFields({ name: 'Release Date', value: formattedDate, inline: true });
            
            // Check if game is upcoming and add countdown
            const releaseDate = new Date(game.releaseDate);
            const now = new Date();
            if (releaseDate > now) {
                const timeUntilRelease = Utils.msToTime(releaseDate - now);
                let countdownText = '';
                if (timeUntilRelease.days > 0) countdownText += `${timeUntilRelease.days} days `;
                if (timeUntilRelease.hours > 0) countdownText += `${timeUntilRelease.hours} hours `;
                if (timeUntilRelease.minutes > 0) countdownText += `${timeUntilRelease.minutes} minutes`;
                embed.addFields({ name: 'Releasing In', value: countdownText.trim() || 'Soon', inline: true });
            }
        }

        // Handle social media links
        let twitterHandle = null;
        let steamId = null;
        
        if (game.sources) {
            game.sources.forEach(source => {
                if (source[SourceType.TWITTER]) {
                    twitterHandle = source[SourceType.TWITTER];
                }
                if (source[SourceType.STEAM_INTERNAL]) {
                    steamId = source[SourceType.STEAM_INTERNAL];
                }
            });
        }

        // Add social media links
        const linkFields = [];
        
        if (twitterHandle) {
            linkFields.push({
                name: 'Twitter',
                value: `[${twitterHandle}](https://twitter.com/${twitterHandle})`,
                inline: true
            });
        }
        
        if (steamId) {
            linkFields.push({
                name: 'Steam',
                value: `[View on Store](https://store.steampowered.com/app/${steamId}/)`,
                inline: true
            });
            
            // Try to fetch game image and data if Steam ID is available
            try {
                const gameData = await Utils.getSteamGameData(steamId, countryCode);
                if (gameData && gameData.headerImage) {
                    embed.setImage(gameData.headerImage);
                }
                
                // Add publisher and developer info if available
                if (gameData) {
                    if (gameData.publishers && gameData.publishers.length > 0) {
                        embed.addFields({
                            name: 'Publisher',
                            value: gameData.publishers.join(', '),
                            inline: true
                        });
                    }
                    
                    if (gameData.developers && gameData.developers.length > 0) {
                        embed.addFields({
                            name: 'Developer',
                            value: gameData.developers.join(', '),
                            inline: true
                        });
                    }
                    
                    // Add price information with improved handling for unreleased games
                    if (gameData.price) {
                        let priceText = gameData.price;
                        
                        // Show discount if applicable
                        if (gameData.discountPercent && gameData.discountPercent > 0) {
                            priceText = `💰 ${gameData.price} ~~${gameData.originalPrice}~~ (-${gameData.discountPercent}%)`;
                        } else {
                            priceText = `💰 ${gameData.price}`;
                        }
                        
                        embed.addFields({
                            name: 'Price',
                            value: priceText,
                            inline: true
                        });
                    } else if (gameData.isFree === true) {
                        // Only show as free if explicitly marked free
                        embed.addFields({
                            name: 'Price',
                            value: '🎮 Free to Play',
                            inline: true
                        });
                    } else {
                        // Check if the game is unreleased
                        const isUnreleased = gameData.releaseDate && new Date(gameData.releaseDate) > new Date();
                        
                        // Different message for unreleased games
                        embed.addFields({
                            name: 'Price',
                            value: isUnreleased ? '💲 Price not announced yet' : '💲 Check Steam store for current price',
                            inline: true
                        });
                    }
                    
                    // Add review information if available
                    if (gameData.reviewScore) {
                        let reviewText = `${gameData.reviewScore}% Positive`;
                        if (gameData.reviewCount) {
                            reviewText += ` (${gameData.reviewCount.toLocaleString()} reviews)`;
                        }
                        
                        // Add review description
                        if (gameData.reviewDescription) {
                            reviewText += `\n${gameData.reviewDescription}`;
                        }
                        
                        embed.addFields({
                            name: 'User Reviews',
                            value: reviewText,
                            inline: false
                        });
                    }
                }
            } catch (error) {
                logger.error(`Error fetching Steam game data: ${error.message}`);
            }
        }
        
        if (linkFields.length > 0) {
            embed.addFields(linkFields);
        }
        
        // Add footer
        embed.setFooter({
            text: 'Game News Forge | Game Information',
            iconURL: 'https://cdn.discordapp.com/avatars/1239574548928794655/e6726f56578da8c3d1f495dd2f509b33'
        });
        
        // Create a button based on subscription status
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`game_subscription_${gameId}`)
                    .setLabel(isSubscribed ? 'Unsubscribe' : 'Subscribe')
                    .setStyle(isSubscribed ? ButtonStyle.Danger : ButtonStyle.Success)
                    .setEmoji(isSubscribed ? '🔕' : '🔔')
            );

        logger.info(`Getting information about game: ${gameName} (Subscribed: ${isSubscribed})`);
        const response = await interaction.editReply({ 
            embeds: [embed],
            components: [row]
        });

        // Create a collector for button interactions
        const collector = response.createMessageComponentCollector({ 
            time: COLLECTOR_TIMEOUT
        });

        collector.on('collect', async buttonInteraction => {
            // Check if the user who pressed the button is the one who ran the command
            if (buttonInteraction.user.id !== interaction.user.id) {
                await buttonInteraction.reply({ 
                    content: 'Only the user who ran this command can use these buttons.',
                    ephemeral: true 
                });
                return;
            }

            // Create a unique key for this button (combination of game ID and user)
            const cooldownKey = `${gameId}_${buttonInteraction.user.id}`;
            
            // Check if this button is on cooldown
            if (buttonCooldowns.has(cooldownKey)) {
                const timeLeft = buttonCooldowns.get(cooldownKey) - Date.now();
                if (timeLeft > 0) {
                    // Button is still on cooldown
                    await buttonInteraction.reply({ 
                        content: `Please wait ${(timeLeft / 1000).toFixed(1)} seconds before using this button again.`,
                        ephemeral: true 
                    });
                    return;
                }
            }
            
            await buttonInteraction.deferUpdate();
            
            try {
                // Set the cooldown and visually disable the button temporarily
                const cooldownEnd = Date.now() + COOLDOWN_DURATION;
                buttonCooldowns.set(cooldownKey, cooldownEnd);
                
                // Get current subscription status for button text
                const currentStatus = await gameDatabaseService.isGuildSubscribed(interaction.guildId, gameId);
                
                // Show processing state by updating the button to a cooldown state with countdown
                const loadingRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`game_subscription_${gameId}_loading`)
                            .setLabel(`${currentStatus ? 'Unsubscribing' : 'Subscribing'}... (${COOLDOWN_DURATION / 1000}s)`)
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('⏱️')
                            .setDisabled(true)
                    );
        
                await interaction.editReply({
                    embeds: [embed],
                    components: [loadingRow]
                });
                
                // Update countdown every second for better UX
                let secondsLeft = Math.ceil(COOLDOWN_DURATION / 1000);
                const countdownInterval = setInterval(async () => {
                    secondsLeft--;
                    if (secondsLeft > 0) {
                        const countdownRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`game_subscription_${gameId}_loading`)
                                    .setLabel(`${currentStatus ? 'Unsubscribing' : 'Subscribing'}... (${secondsLeft}s)`)
                                    .setStyle(ButtonStyle.Secondary)
                                    .setEmoji('⏱️')
                                    .setDisabled(true)
                            );
                        
                        await interaction.editReply({
                            embeds: [embed],
                            components: [countdownRow]
                        }).catch(e => {
                            // Silently fail if we can't update (message might be gone)
                            clearInterval(countdownInterval);
                        });
                    }
                }, 1000);
                
                // Perform the action
                if (currentStatus) {
                    // Unsubscribe
                    await db.unlinkGameFromGuild(interaction.guildId, gameId);
                    logger.info(`Guild ${interaction.guildId} unsubscribed from game: ${gameName} (ID: ${gameId})`);
                } else {
                    // Subscribe
                    await gameDatabaseService.subscribeGuildToGame(interaction.guildId, gameId);
                    logger.info(`Guild ${interaction.guildId} subscribed to game: ${gameName} (ID: ${gameId})`);
                }
                
                // Clear the countdown interval
                clearInterval(countdownInterval);
                
                // Update subscription status for UI update
                const newStatus = await gameDatabaseService.isGuildSubscribed(interaction.guildId, gameId);
                
                // Send ephemeral confirmation message immediately
                await buttonInteraction.followUp({
                    content: newStatus 
                        ? `✅ Successfully subscribed to **${gameName}**! You'll receive updates for this game.`
                        : `✅ Successfully unsubscribed from **${gameName}**. You'll no longer receive updates for this game.`,
                    ephemeral: true
                });
                
                // Calculate remaining cooldown time
                const remainingCooldown = cooldownEnd - Date.now();
                
                if (remainingCooldown > 0) {
                    // Show a "cooldown complete" message when time is up
                    setTimeout(async () => {
                        // Update the button to enabled state after cooldown
                        const updatedRow = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`game_subscription_${gameId}`)
                                    .setLabel(newStatus ? 'Unsubscribe' : 'Subscribe')
                                    .setStyle(newStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                                    .setEmoji(newStatus ? '🔕' : '🔔')
                            );
                        
                        await interaction.editReply({
                            embeds: [embed],
                            components: [updatedRow]
                        }).catch(e => logger.error('Failed to update button after cooldown:', e));
                        
                        // Clean up cooldown after it's complete
                        buttonCooldowns.delete(cooldownKey);
                    }, remainingCooldown);
                } else {
                    // If somehow the cooldown already ended, update immediately
                    const updatedRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`game_subscription_${gameId}`)
                                .setLabel(newStatus ? 'Unsubscribe' : 'Subscribe')
                                .setStyle(newStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                                .setEmoji(newStatus ? '🔕' : '🔔')
                        );
                    
                    await interaction.editReply({
                        embeds: [embed],
                        components: [updatedRow]
                    });
                    
                    // Clean up cooldown
                    buttonCooldowns.delete(cooldownKey);
                }
                
            } catch (error) {
                logger.error(`Error handling subscription button: ${error.message}`);
                
                // Reset the button to its previous state
                const currentStatus = await gameDatabaseService.isGuildSubscribed(interaction.guildId, gameId);
                const errorRow = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`game_subscription_${gameId}`)
                            .setLabel(currentStatus ? 'Unsubscribe' : 'Subscribe')
                            .setStyle(currentStatus ? ButtonStyle.Danger : ButtonStyle.Success)
                            .setEmoji(currentStatus ? '🔕' : '🔔')
                    );
                
                await interaction.editReply({
                    embeds: [embed],
                    components: [errorRow]
                });
                
                // Send error message
                await buttonInteraction.followUp({
                    content: `❌ Error: ${error.message || 'Could not process your request'}`,
                    ephemeral: true
                });
                
                // Clean up cooldown after error
                buttonCooldowns.delete(cooldownKey);
            }
        });

        collector.on('end', () => {
            // Disable the button when the collector expires
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`game_subscription_${gameId}`)
                        .setLabel(isSubscribed ? 'Unsubscribe' : 'Subscribe')
                        .setStyle(isSubscribed ? ButtonStyle.Danger : ButtonStyle.Success)
                        .setEmoji(isSubscribed ? '🔕' : '🔔')
                        .setDisabled(true)
                );
            
            interaction.editReply({ 
                embeds: [embed], 
                components: [disabledRow] 
            }).catch(e => logger.error('Failed to disable button:', e));
        });
    },
};