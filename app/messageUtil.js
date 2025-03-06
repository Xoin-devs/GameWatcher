const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const client = require('./client');
const { convert } = require('html-to-text');
const PrettyColors = require('./constants/prettyColors');
const DiscordConstants = require('./constants/discordConstants');
const DatabaseManager = require('./database');
const logger = require('./logger');

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

    async sendTweetToAllChannels(tweet, gameName) {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuildsForGame(gameName);
        for (let guild of guilds) {
            await this.sendTweetMessage(tweet, guild.channel_id);
        }
    }

    async sendTweetMessage(tweet, channelId) {
        const twitterIcon = new AttachmentBuilder('./assets/icon_twitter.png');
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

        const channel = client.channels.cache.get(channelId);
        if (channel) {
            await channel.send({ embeds: [embed], files: [twitterIcon] });
        }
    }

    async sendSteamNewsToAllChannels(newsItem, gameName) {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuildsForGame(gameName);
        for (let guild of guilds) {
            logger.debug(`Sending news about ${gameName} to guild ${guild.id}`);
            await this.sendSteamNewsMessage(newsItem, guild.channel_id);
        }
    }

    async sendSteamNewsMessage(newsItem, channelId) {
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
        const icon = new AttachmentBuilder(`./assets/${iconName}`);

        const embed = new EmbedBuilder()
            .setTitle(newsItem.title)
            .setURL(newsItem.url)
            .setDescription(content)
            .setColor(PrettyColors.BLUE_STEAM)
            .setImage(newsItem.image)
            .setFooter({ text: newsItem.feedname, iconURL: `attachment://${iconName}` });

        const channel = client.channels.cache.get(channelId);
        if (channel) {
            await channel.send({ embeds: [embed], files: [icon] });
        }
    }

    static async sendGameReleaseToAllChannels(game) {
        const db = await DatabaseManager.getInstance();
        const guilds = await db.getGuilds();
        for (let guild of guilds) {
            await this.sendGameReleaseMessage(game, guild.channel_id);
        }
    }

    static async sendGameReleaseMessage(game, channelId) {
        const embed = new EmbedBuilder()
            .setTitle(`🎉 ${game} has been released!`)
            .setColor(PrettyColors.GREEN)
            .setFooter({ text: 'Release date' });

        const channel = client.channels.cache.get(channelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    }
}

module.exports = MessageUtil;
