// this class is used to get latest steam news for a game given the link to the game's steam page
// this class uses the steam API to get the news

const axios = require('axios');
const cheerio = require('cheerio');

class SteamWrapper {
    constructor() {
        this.steamNewsUrl = 'http://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=';
    }

    async getNews(appId, count = 1) {
        try {
            const response = await axios.get(`${this.steamNewsUrl}${appId}&count=${count}`);
            const newsItems = response.data.appnews.newsitems;
            return newsItems.map(item => ({
                id: item.gid,
                title: item.title,
                url: item.url,
                contents: item.contents,
                date: item.date,
                image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
            }));
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = SteamWrapper;