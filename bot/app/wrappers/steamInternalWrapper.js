const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../../../shared/logger');
const SteamFeedType = require('../constants/steamFeedType');

class SteamInternalWrapper {
    constructor() {
        this.steamInternalUrl = 'https://store.steampowered.com/feeds/news/app/%appid%/?cc=EN&l=english';
        this.parser = new xml2js.Parser({ explicitArray: false });
    }
    
    async getNews(appId) {
        try {
            const url = this.steamInternalUrl.replace('%appid%', appId);
            const response = await axios.get(url);

            logger.info(`Getting news for app ${appId} on steam internal community feeds`);

            const result = await this.parseXML(response.data);
            let newsItems = result.rss.channel.item || [];

            if (!Array.isArray(newsItems)) {
                newsItems = [newsItems];
            }

            const mappedItems = newsItems.map(item => ({
                id: item?.guid?._ || null,
                title: item.title,
                url: item.link,
                contents: item.description,
                date: item.pubDate,
                image: item?.enclosure?.$?.url && item?.enclosure?.$?.type.startsWith('image/') ? item.enclosure.$.url : null,
                feedname: 'Steam',
                type: SteamFeedType.INTERNAL
            }));

            return mappedItems;
        } catch (error) {
            logger.error(`Error fetching news for app ${appId}`, error);
            throw error;
        }
    }

    parseXML(data) {
        return new Promise((resolve, reject) => {
            this.parser.parseString(data, (err, result) => {
                if (err) {
                    logger.error('Error parsing XML data');
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
}

module.exports = { SteamInternalWrapper };