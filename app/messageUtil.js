const { EmbedBuilder } = require('discord.js');
const { readConfig, writeConfig } = require('./config');
const client = require('./client');
const { convert } = require('html-to-text');

let BBCodeParser;
let bbParser;

import('js-bbcode-parser/src/index.js').then(module => {
    BBCodeParser = module.default || module;

    bbParser = new BBCodeParser({
        '\\[br\\]': '',

        '\\[b\\](.+?)\\[/b\\]': '$1',
        '\\[i\\](.+?)\\[/i\\]': '$1',
        '\\[u\\](.+?)\\[/u\\]': '$1',

        '\\[h1\\](.+?)\\[/h1\\]': '$1',
        '\\[h2\\](.+?)\\[/h2\\]': '$1',
        '\\[h3\\](.+?)\\[/h3\\]': '$1',
        '\\[h4\\](.+?)\\[/h4\\]': '$1',
        '\\[h5\\](.+?)\\[/h5\\]': '$1',
        '\\[h6\\](.+?)\\[/h6\\]': '$1',

        '\\[p\\](.+?)\\[/p\\]': '$1',
        '\\[code\\](.+?)\\[/code\\]': '$1',

        '\\[color=(.+?)\\](.+?)\\[/color\\]': '$2',
        '\\[size=([0-9]+)\\](.+?)\\[/size\\]': '$2',

        '\\[previewyoutube=(.+?);.+?\\]\\[/previewyoutube\\]': 'https://youtu.be/$1',
        '\\[img\\](.+?)\\[/img\\]': '$1',
        '\\[img=(.+?)\\]': '$1',

        '\\[email\\](.+?)\\[/email\\]': '$1',
        '\\[email=(.+?)\\](.+?)\\[/email\\]': '$2',

        '\\[url\\](.+?)\\[/url\\]': '$1',
        '\\[url=(.+?)\\|onclick\\](.+?)\\[/url\\]': '$2',
        '\\[url=(.+?)\\starget=(.+?)\\](.+?)\\[/url\\]': '$3',
        '\\[url=(.+?)\\](.+?)\\[/url\\]': '$2',

        '\\[\\*\\]': '',
        '\\[a=(.+?)\\](.+?)\\[/a\\]': '$2',

        '\\[list\\](.+?)\\[/list\\]': '$1',
        '\\[\\*\\](.+?)\\[/\\*\\]': '$1'
    });
}).catch(console.error);

class MessageUtil {
    static createReleaseMessage(gameName, releaseDateTimeStamp, message) {
        const embed = new EmbedBuilder()
            .setTitle(message)
            .setDescription(`Coming on \*\*${releaseDateTimeStamp}\*\*`)
            .setColor('#0099ff')
            .setFooter({ text: `Release Bot` });

        return embed;
    }

    static getRandomColor() {
        const color = '#' + ((Math.random() * 0xFFFFFF << 0).toString(16)).padStart(6, '0');
        return color;
    }

    async sendTweetToAllChannels(tweet) {
        const config = readConfig();
        for (let guild of config.guilds) {
            await this.sendTweetMessage(tweet, guild.channelId);
        }
    }

    async sendTweetMessage(tweet, channelId) {
        const embed = new EmbedBuilder()
            .setTitle(`${tweet.name} on X`)
            .setURL(tweet.tweet_url)
            .setDescription(tweet.text)
            .setColor(MessageUtil.getRandomColor())
            .setFooter({ text: `Twitter` });

        if (tweet.media.length > 0) {
            embed.setImage(tweet.media[0].url);
        }

        const channel = client.channels.cache.get(channelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    }

    async sendSteamNewsToAllChannels(newsItem) {
        const config = readConfig();
        for (let guild of config.guilds) {
            await this.sendSteamNewsMessage(newsItem, guild.channelId);
        }
    }

    async sendSteamNewsMessage(newsItem, channelId) {
        const parserA = new BBCodeParser({});
        parserA.setCodes({});

        let content = convert(newsItem.contents, {
            wordwrap: null,
            preserveNewlines: true,
            selectors: [
                { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
                { selector: 'img', format: 'skip' }
            ]
        });
        content = bbParser.parse(content);

        if (!content) {
            console.error('Content is empty or undefined');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(newsItem.title)
            .setURL(newsItem.url)
            .setDescription(content)
            .setColor(MessageUtil.getRandomColor())
            .setImage(newsItem.image)
            .setFooter({ text: `Steam News` });

        if (!embed) {
            console.error('Embed is empty or undefined');
            return;
        }

        const channel = client.channels.cache.get(channelId);
        if (channel) {
            await channel.send({ embeds: [embed] });
        }
    }
}

module.exports = MessageUtil;
