const axios = require('axios');
const xml2js = require('xml2js');
const logger = require('../logger');
const SteamFeedType = require('../constants/steamFeedType');

class SteamInternalWrapper {
    constructor() {
        this.steamInternalUrl = 'https://store.steampowered.com/feeds/news/app/%appid%/?cc=EN&l=english';
        this.parser = new xml2js.Parser({ explicitArray: false });
    }

    async getNews(appId) {
        return new Promise(async (resolve, reject) => {
            try {
                const url = this.steamInternalUrl.replace('%appid%', appId);
                const response = await axios.get(url);

                logger.info(`Gettings news for app ${appId} on steam internal community feeds`);

                this.parser.parseString(response.data, (err, result) => {
                    if (err) {
                        logger.error(`Error parsing news for app ${appId}`);
                        reject(err);
                    } else {
                        let newsItems = result.rss.channel.item || [];

                        if (!Array.isArray(newsItems)) {
                            newsItems = [newsItems];
                        }

                        let mappedItems = newsItems.map(item => ({
                            id: item?.guid?._ || null,
                            title: item.title,
                            url: item.link,
                            contents: item.description,
                            date: item.pubDate,
                            image: item?.enclosure?.$?.url && item?.enclosure?.$?.type.startsWith('image/') ? item.enclosure.$.url : null,
                            feedname: 'Steam',
                            type: SteamFeedType.INTERNAL
                        }));

                        resolve(mappedItems);
                    }
                });
            } catch (error) {
                logger.error(`Error fetching news for app ${appId}`, error);
                reject(error);
            }
        });
    }
}

module.exports = { SteamInternalWrapper };