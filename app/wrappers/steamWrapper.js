const axios = require('axios');

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
                url: item.url.replace(" ", "%20"),
                contents: item.contents,
                date: item.date,
                image: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
            }));
        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = { SteamWrapper };