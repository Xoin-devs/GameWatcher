const axios = require('axios');
const logger = require('../logger');
const SteamFeedType = require('../constants/steamFeedType');

class SteamExternalWrapper {
    constructor() {
        // INFO: We could also based our scraping based on feed_type = 0, but we are going to use a list of known curators
        this.steamExternalUrl = 'http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?feeds=PC%20Gamer,rps,VG247,PCGamesN&appid=';
    }

    async getNews(appId, count = 1) {
        try {
            const response = await axios.get(`${this.steamExternalUrl}${appId}&count=${count}`);
            const newsItems = response.data.appnews.newsitems;

            logger.info(`Gettings news for app ${appId} on steam external curator feeds`);

            return newsItems.map(item => ({
                id: item.gid,
                title: item.title,
                url: item.url.replace(" ", "%20"),
                contents: item.contents,
                date: item.date,
                image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
                feedname: item.feedname,
                type: SteamFeedType.EXTERNAL
            }));
        } catch (error) {
            logger.error(`Error fetching news for app ${appId}`);
        }
    }
}

module.exports = { SteamExternalWrapper };