const { EmbedBuilder, AttachmentBuilder, WebhookClient } = require('discord.js');
const client = require('@bot/client');
const { convert } = require('html-to-text');
const PrettyColors = require('@shared/prettyColors');
const DiscordConstants = require('@bot/constants/discordConstants');
const DatabaseManager = require('@shared/database');
const logger = require('@shared/logger');

class MessageUtil {
    static getRandomColor() {
        return `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`;
    }

    static truncateContent(content, endMessage) {
        const maxLength = DiscordConstants.MESSASGE_MAX_LENGTH;
        return content.length <= maxLength ? content : content.substring(0, maxLength - endMessage.length) + endMessage;
    }

    static getIconNameFromFeedname(feedname) {
        switch (feedname) {
            case 'PC Gamer':
                return 'icon_pc_gamer.png';
            case 'VG247':
                return 'icon_vg247.png';
            case 'RPS':
                return 'icon_rps.png';
            case 'PCGamesN':
                return 'icon_pcgamesn.png';
            default:
                return 'icon_steam.png';
        }
    }

    // Tweet methods
    async sendTweetToAllChannels(tweet, gameName) {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuildsForGame(gameName);
        for (let guild of guilds) {
            if (!guild.channel_id && !guild.webhook_url) {
                logger.error(`No channel_id or webhook_url for guild ${guild.id}`);
                continue;
            }

            logger.debug(`Sending tweet to guild ${guild.id} for game ${gameName}`);

            const embed = this.buildTweetEmbed(tweet);
            const files = [new AttachmentBuilder('./assets/icon_twitter.png')];

            // Add content field with game name for better mobile notifications
            const messageContent = `[Twitter] ${gameName} | Tweet from ${tweet.name}`;

            if (guild.webhook_url) {
                await MessageUtil.sendToWebhook(guild.webhook_url, { content: messageContent, embeds: [embed], files });
            } else {
                await MessageUtil.sendToChannel(guild.channel_id, { content: messageContent, embeds: [embed], files });
            }
        }
    }

    buildTweetEmbed(tweet) {
        const content = MessageUtil.truncateContent(tweet.text, '... Read more on Twitter');
        const embed = new EmbedBuilder()
            .setTitle(`${tweet.name} on X`)
            .setURL(tweet.tweet_url)
            .setDescription(content)
            .setColor(PrettyColors.BLUE_TWITTER)
            .setFooter({ text: 'Twitter', iconURL: 'attachment://icon_twitter.png' });

        if (tweet.media.length > 0) {
            embed.setImage(tweet.media[0].url);
        }

        return embed;
    }

    // Steam News methods
    async sendSteamNewsToAllChannels(newsItem, gameName) {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuildsForGame(gameName);
        for (let guild of guilds) {
            if (!guild.channel_id && !guild.webhook_url) {
                logger.error(`No channel_id or webhook_url for guild ${guild.id}`);
                continue;
            }

            logger.debug(`Sending Steam news to guild ${guild.id} for game ${gameName}`);

            const embed = this.buildSteamNewsEmbed(newsItem);
            const iconName = MessageUtil.getIconNameFromFeedname(newsItem.feedname);
            const files = [new AttachmentBuilder(`./assets/${iconName}`)];

            // Add content field with game name for better mobile notifications
            const messageContent = `[Steam] ${gameName}: ${newsItem.title}`;

            if (guild.webhook_url) {
                await MessageUtil.sendToWebhook(guild.webhook_url, { content: messageContent, embeds: [embed], files });
            } else {
                await MessageUtil.sendToChannel(guild.channel_id, { content: messageContent, embeds: [embed], files });
            }
        }
    }

    static convertHtmlToPlainText(html) {
        if (!html) return '';
    
        // Helper function to extract all text content recursively
        function extractTextContent(elem) {
            if (!elem || !elem.children) return '';
            
            let text = '';
            elem.children.forEach(child => {
                if (child.type === 'text') {
                    text += child.data || '';
                } else if (child.children && child.children.length > 0) {
                    text += extractTextContent(child);
                }
            });
            return text;
        }
    
        // Helper function to check if a string is a URL
        function isURL(text) {
            // Simple URL detection - checks for http://, https://, or www. at the start
            return /^(https?:\/\/|www\.)/i.test(text.trim());
        }
    
        // Create content collector that doesn't use walk
        const steamLink = function (elem, walk, builder, formatOptions) {
            // Get the href attribute
            const href = elem.attribs.href;
            
            // Get the inner text using our recursive function
            const innerText = extractTextContent(elem).trim();
            
            // If the inner text is a URL, just display the inner text (not the href)
            // If the inner text matches the href, just display the href
            if (isURL(innerText)) {
                builder.addInline(innerText);
            } else if (innerText === href) {
                builder.addInline(href);
            } else {
                builder.addInline(`[${innerText}](${href})`);
            }
        };
        
        const basicURL = function (elem, walk, builder, formatOptions) {
            // Same implementation as steamLink
            const href = elem.attribs.href;
            
            // Get the inner text using our recursive function
            const innerText = extractTextContent(elem).trim();
            
            // If the inner text is a URL, just display the inner text (not the href)
            // If the inner text matches the href, just display the href
            if (isURL(innerText)) {
                builder.addInline(innerText);
            } else if (innerText === href) {
                builder.addInline(href);
            } else {
                builder.addInline(`[${innerText}](${href})`);
            }
        };
    
        let text = convert(html, {
            wordwrap: null,
            preserveNewlines: true,
            limits: {
                maxDepth: 100,
                maxChildNodes: 1000,
                maxInputLength: 1000000
            },
            formatters: {
                'bold': function (elem, walk, builder, formatOptions) {
                    builder.addInline('**');
                    walk(elem.children, builder);
                    builder.addInline('**');
                },
                'italic': function (elem, walk, builder, formatOptions) {
                    builder.addInline('*');
                    walk(elem.children, builder);
                    builder.addInline('*');
                },
                'underline': function (elem, walk, builder, formatOptions) {
                    builder.addInline('__');
                    walk(elem.children, builder);
                    builder.addInline('__');
                },
                'iframe': function (elem, walk, builder, formatOptions) {
                    builder.openBlock();
                    builder.addInline('[▶️ Youtube Video](' + elem.attribs.src + ')');
                    builder.closeBlock();
                },
                'steamLink': steamLink,
                'basicURL': basicURL
            },
            selectors: [
                { selector: 'a', format: 'basicURL' },
                { selector: 'a.bb_link', format: 'steamLink' },
                { selector: 'img', format: 'skip' },
                { selector: 'b', format: 'bold' },
                { selector: 'strong', format: 'bold' },
                { selector: 'i', format: 'italic' },
                { selector: 'em', format: 'italic' },
                { selector: 'u', format: 'underline' },
                { selector: 'iframe', format: 'iframe' }
            ]
        });
    
        // Remove false URL links that are adjacent markdown-style with relative paths
        // e.g., [Dune Awakening](/dune-awakening) but not [Text] (/some-path)
        const regex = /\[([^\]]+?)\]\(\/[^\s)]+\)/g;
        text = text.replace(regex, (match, p1) => {
            return p1;
        });
    
        // Clean up any excessive whitespace
        return text.replace(/\n{3,}/g, '\n\n').trim();
    }

    buildSteamNewsEmbed(newsItem) {
        let content = MessageUtil.convertHtmlToPlainText(newsItem.contents);
        content = MessageUtil.truncateContent(content, `...\n[Read more on Steam](${newsItem.url})`);

        const iconName = MessageUtil.getIconNameFromFeedname(newsItem.feedname);
        const embed = new EmbedBuilder()
            .setTitle(newsItem.title)
            .setURL(newsItem.url)
            .setDescription(content)
            .setColor(PrettyColors.BLUE_STEAM)
            .setImage(newsItem.image)
            .setFooter({ text: newsItem.feedname, iconURL: `attachment://${iconName}` });

        return embed;
    }

    // Game Release methods
    static async sendGameReleaseToAllGuilds(game) {
        try {
            const db = await DatabaseManager.getInstance();
            const guilds = await db.getGuildsForGame(game.name);
            const gameName = game.name;

            if (!guilds || guilds.length === 0) {
                logger.warn(`No guilds found for game ${gameName}`);
                return;
            }

            logger.info(`Sending release announcement for ${gameName} to ${guilds.length} guilds`);

            for (const guild of guilds) {
                try {
                    const embed = this.buildGameReleaseEmbed(gameName);
                    const messageContent = `[Release] ${gameName} has officially released!`;

                    if (guild.webhook_url) {
                        await this.sendToWebhook(guild.webhook_url, { content: messageContent, embeds: [embed] });
                    } else if (guild.channel_id) {
                        await this.sendToChannel(guild.channel_id, { content: messageContent, embeds: [embed] });
                    } else {
                        logger.warn(`No webhook URL or channel ID for guild ${guild.id}`);
                    }
                } catch (error) {
                    logger.error(`Failed to send release announcement for ${gameName} to guild ${guild.id}: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Error in sendGameReleaseToAllGuilds: ${error.message}`);
        }
    }

    static async sendGameReleaseTeaseToAllGuilds(game) {
        try {
            const gameName = game.name;
            const db = await DatabaseManager.getInstance();
            const guilds = await db.getGuildsForGame(gameName);
            const releaseDate = game.releaseDate;

            if (!guilds || guilds.length === 0) {
                logger.warn(`No guilds found for game ${gameName}`);
                return;
            }

            logger.info(`Sending teaser for ${gameName} to ${guilds.length} guilds`);

            for (const guild of guilds) {
                try {
                    const embed = this.buildGameReleaseTeaseEmbed(gameName, releaseDate);
                    const messageContent = `[Release] ${gameName} is coming soon!`;

                    if (guild.webhook_url) {
                        await this.sendToWebhook(guild.webhook_url, { content: messageContent, embeds: [embed] });
                    } else if (guild.channel_id) {
                        await this.sendToChannel(guild.channel_id, { content: messageContent, embeds: [embed] });
                    } else {
                        logger.warn(`No webhook URL or channel ID for guild ${guild.id}`);
                    }
                } catch (error) {
                    logger.error(`Failed to send teaser for ${gameName} to guild ${guild.id}: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Error in sendGameReleaseTeaseToAllChannels: ${error.message}`);
        }
    }

    // Release date change notification method
    static async sendGameDateChangeToAllGuilds(game, oldDate, newDate) {
        try {
            const db = await DatabaseManager.getInstance();
            const guilds = await db.getGuildsForGame(game.name);
            const gameName = game.name;

            if (!guilds || guilds.length === 0) {
                logger.warn(`No guilds found for game ${gameName}`);
                return;
            }

            logger.info(`Sending release date change notification for ${gameName} to ${guilds.length} guilds`);

            // Format dates for better display
            const oldDateFormatted = new Date(oldDate).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            
            const newDateFormatted = new Date(newDate).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            for (const guild of guilds) {
                try {
                    const embed = this.buildGameDateChangeEmbed(gameName, oldDateFormatted, newDateFormatted);
                    const messageContent = `[Update] ${gameName} release date has changed!`;

                    if (guild.webhook_url) {
                        await this.sendToWebhook(guild.webhook_url, { content: messageContent, embeds: [embed] });
                    } else if (guild.channel_id) {
                        await this.sendToChannel(guild.channel_id, { content: messageContent, embeds: [embed] });
                    } else {
                        logger.warn(`No webhook URL or channel ID for guild ${guild.id}`);
                    }
                } catch (error) {
                    logger.error(`Failed to send date change notification for ${gameName} to guild ${guild.id}: ${error.message}`);
                }
            }
        } catch (error) {
            logger.error(`Error in sendGameDateChangeToAllGuilds: ${error.message}`);
        }
    }

    static buildGameReleaseEmbed(gameName) {
        return new EmbedBuilder()
            .setTitle(`🔥 ${gameName} is Live!`)
            .setDescription(`The wait is over and **${gameName}** is now available to play. Dive in and experience the excitement!`)
            .setColor(PrettyColors.GREEN)
            .setFooter({ text: 'Enjoy the game!' })
            .setTimestamp();
    }

    static buildGameReleaseTeaseEmbed(gameName, releaseDate) {
        const formattedDate = new Date(releaseDate).toLocaleDateString('en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        return new EmbedBuilder()
            .setTitle(`🚀 Coming Soon: ${gameName}`)
            .setDescription(`Hold on tight! **${gameName}** will be launching on ${formattedDate}.\nStay tuned for more updates!`)
            .setColor(PrettyColors.ORANGE)
            .setFooter({ text: 'Get hyped!' })
            .setTimestamp();
    }

    static buildGameDateChangeEmbed(gameName, oldDate, newDate) {
        // Determine if it's a delay or advancement
        const newDateObj = new Date(newDate.replace(/(\d+)(st|nd|rd|th)/, '$1'));
        const oldDateObj = new Date(oldDate.replace(/(\d+)(st|nd|rd|th)/, '$1'));
        
        let changeType, color, emoji;
        if (newDateObj > oldDateObj) {
            changeType = "delayed";
            color = PrettyColors.YELLOW;
            emoji = "⏰";
        } else {
            changeType = "moved forward";
            color = PrettyColors.GREEN;
            emoji = "🎉";
        }
        
        return new EmbedBuilder()
            .setTitle(`${emoji} ${gameName} Release Date Changed`)
            .setDescription(`**${gameName}** has been ${changeType}.\n\nPrevious release date: ${oldDate}\nNew release date: ${newDate}\n\nWe'll keep you updated on any further changes.`)
            .setColor(color)
            .setFooter({ text: 'Stay tuned!' })
            .setTimestamp();
    }

    // Generic sending methods
    static async sendToChannel(channelId, messageOptions) {
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            await channel.send(messageOptions);
            return true;
        }
        return false;
    }

    static async sendToWebhook(webhookUrl, messageOptions) {
        try {
            const webhookId = webhookUrl.split('/').slice(-2)[0];
            const webhookToken = webhookUrl.split('/').slice(-1)[0];

            const webhook = new WebhookClient({ id: webhookId, token: webhookToken });
            await webhook.send(messageOptions);
            return true;
        } catch (error) {
            logger.error(`Error sending webhook message: ${error.message}`);
            return false;
        }
    }
}

module.exports = MessageUtil;
