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
            const embed = this.buildTweetEmbed(tweet);
            const files = [new AttachmentBuilder('./assets/icon_twitter.png')];

            if (guild.webhook_url) {
                await MessageUtil.sendToWebhook(guild.webhook_url, { embeds: [embed], files });
            } else {
                await MessageUtil.sendToChannel(guild.channel_id, { embeds: [embed], files });
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
            logger.debug(`Sending news about ${gameName} to guild ${guild.id}`);
            const embed = this.buildSteamNewsEmbed(newsItem);
            const iconName = MessageUtil.getIconNameFromFeedname(newsItem.feedname);
            const files = [new AttachmentBuilder(`./assets/${iconName}`)];

            if (guild.webhook_url) {
                await MessageUtil.sendToWebhook(guild.webhook_url, { embeds: [embed], files });
            } else {
                await MessageUtil.sendToChannel(guild.channel_id, { embeds: [embed], files });
            }
        }
    }

    buildSteamNewsEmbed(newsItem) {
        let content = convert(newsItem.contents, {
            wordwrap: null,
            preserveNewlines: true,
            selectors: [
                { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
                { selector: 'img', format: 'skip' }
            ]
        });
        content = MessageUtil.truncateContent(content, '... Read more on Steam');

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
    static async sendGameReleaseToAllChannels(game) {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuilds();
        for (let guild of guilds) {
            const embed = this.buildGameReleaseEmbed(game);

            if (guild.webhook_url) {
                await this.sendToWebhook(guild.webhook_url, { embeds: [embed] });
            } else {
                await this.sendToChannel(guild.channel_id, { embeds: [embed] });
            }
        }
    }

    static buildGameReleaseEmbed(game) {
        return new EmbedBuilder()
            .setTitle(`🎉 ${game} has been released!`)
            .setColor(PrettyColors.GREEN)
            .setFooter({ text: 'Release date' });
    }

    // Generic sending methods
    static async sendToChannel(channelId, messageOptions) {
        logger.debug(`Sending game release throught channel`);
        const channel = client.channels.cache.get(channelId);
        if (channel) {
            await channel.send(messageOptions);
            return true;
        }
        return false;
    }

    static async sendToWebhook(webhookUrl, messageOptions) {
        logger.debug(`Sending game release throught webhook`);
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
