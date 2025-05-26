const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const CommandHelper = require('@bot/commandHelper');
const CommandsName = require('@bot/constants/commandsName');
const CommandsOption = require('@bot/constants/commandsOption');
const Utils = require('@bot/utils');
const SourceType = require('@bot/constants/sourceType');
const logger = require('@shared/logger');
const DatabaseManager = require('@shared/database');
const axios = require('axios');

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
        
        logger.info(`Getting information about game: ${gameName}`);
        await interaction.editReply({ embeds: [embed] });
    },
};