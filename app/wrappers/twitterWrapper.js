const puppeteer = require('puppeteer');
const logger = require('../logger');

const TWITTER_BASE_URL = 'https://twitter.com';
const TWITTER_API_URL = 'https://api.x.com/graphql/V7H0Ap3';
const DEFAULT_TWEET_COUNT = 4;
const TIMEOUT_DURATION = 10_000;

class Browser {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        this.browser = await puppeteer.launch({ headless: true });
    }

    async newPage() {
        this.page = await this.browser.newPage();
        return this.page;
    }

    static async create() {
        const browser = new Browser();
        await browser.init();
        return browser;
    }
}

class TweetParser {
    parse(tweet) {
        const lightTweet = {
            name: tweet.core.user_results.result.legacy.name,
            text: tweet.legacy.full_text,
            tweet_url: `${TWITTER_BASE_URL}/${tweet.legacy.screen_name}/status/${tweet.legacy.id_str}`,
            media: tweet.legacy.extended_entities?.media.map(media => ({
                type: media.type,
                url: media.media_url_https,
            })) || [],
            date: new Date(tweet.legacy.created_at).toISOString()
        };
        return lightTweet;
    }
}

class TwitterWrapper {
    constructor(browser, parser) {
        this.browser = browser;
        this.parser = parser;
    }

    async getTweets(username, count = DEFAULT_TWEET_COUNT) {
        return new Promise(async (resolve, reject) => {
            try {
                const page = await this.browser.newPage();
                await page.setRequestInterception(true);

                logger.info('Getting tweets for account:', username);

                page.on('request', (request) => { request.continue(); });
                page.on('response', async (response) => {
                    const tweets = await this.handleResponse(response, username, count);
                    if (tweets) {
                        resolve(tweets);
                    }
                });

                await page.goto(`${TWITTER_BASE_URL}/${username}`, { waitUntil: 'networkidle2' });

                setTimeout(() => resolve([]), TIMEOUT_DURATION);
            } catch (error) {
                logger.error('Error getting tweets for account:', username, "\n", error);
                resolve([]);
            }
        });
    }

    handleResponse(response, username, count) {
        return new Promise(async (resolve, reject) => {
            try {
                const url = response.url();
                if (url.includes(TWITTER_API_URL)) {
                    logger.debug('Intercepted response from twitter for account:', username);
                    const json = await response.json();
                    const instructions = json?.data?.user?.result?.timeline_v2?.timeline?.instructions;
                    let tweets = [];
                    if (instructions) {
                        this.processInstructions(instructions, tweets);
                    }

                    // When searching through some accounts, the response can be heavy and random
                    // With 100s of tweets that are nor ordered by date (some years old tweets can appear)
                    // it's done to avoid scraping, so there is nothing we can do about it
                    // we will have tweets that are not up to date, but it's better than nothing

                    tweets.sort((a, b) => new Date(b.date) - new Date(a.date));
                    tweets = tweets.slice(0, count);
                    resolve(tweets);
                }
            } catch (e) {
                logger.warn('Trouble parsing response. It can happen, IT IS NOT A PROBLEM IF THERE IS ANOTHER REQUEST AFTER');
                logger.warn(e);
                resolve(null);
            }
        });
    }

    processInstructions(instructions, tweets) {
        for (let i = 0; i < instructions.length; i++) {
            const instruction = instructions[i];
            if (instruction.type === 'TimelinePinEntry') {
                this.processPinEntry(instruction, tweets);
            }
            if (instruction.type === 'TimelineAddEntries') {
                this.processAddEntries(instruction, tweets);
            }
        }
    }

    processPinEntry(instruction, tweets) {
        const tweet = instruction.entry.content.itemContent.tweet_results?.result;
        if (tweet) {
            const lightTweet = this.parser.parse(tweet);
            tweets.push(lightTweet);
        }
    }

    processAddEntries(instruction, tweets) {
        for (let j = 0; j < instruction.entries.length; j++) {
            const entry = instruction.entries[j];
            if (entry.content.entryType === 'TimelineTimelineItem') {
                this.processTimelineItem(entry, tweets);
            }
            if (entry.content.entryType === 'TimelineTimelineModule') {
                this.processTimelineModule(entry, tweets);
            }
        }
    }

    processTimelineItem(entry, tweets) {
        const tweet = entry.content.itemContent.tweet_results?.result;
        if (tweet) {
            const lightTweet = this.parser.parse(tweet);
            tweets.push(lightTweet);
        }
    }

    processTimelineModule(entry, tweets) {
        const tweetsModule = entry.content.items;
        const tweet = tweetsModule[0].item.itemContent.tweet_results?.result;
        if (tweet) {
            const lightTweet = this.parser.parse(tweet);
            tweets.push(lightTweet);
        }
    }
}

module.exports = { Browser, TweetParser, TwitterWrapper };