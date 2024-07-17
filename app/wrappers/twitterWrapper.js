const puppeteer = require('puppeteer');
const logger = require('../logger');

const TWITTER_BASE_URL = 'https://twitter.com';
const TWITTER_API_URL = 'https://api.x.com/graphql/';
const TWITTER_TWEET_TAG_URL = 'UserTweets';
const DEFAULT_TWEET_COUNT = 4;
const TIMEOUT_DURATION = 10_000;

class TweetParser {
    parse(tweet) {
        return {
            name: tweet.core.user_results.result.legacy.name,
            text: tweet.legacy.full_text,
            tweet_url: `${TWITTER_BASE_URL}/${tweet.legacy.screen_name}/status/${tweet.legacy.id_str}`,
            media: tweet.legacy.extended_entities?.media.map(media => ({
                type: media.type,
                url: media.media_url_https,
            })) || [],
            date: new Date(tweet.legacy.created_at).toISOString()
        };
    }
}

class TwitterWrapper {
    constructor() {
        this.parser = new TweetParser();
        this.browser = null;
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-session-crashed-bubble',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--noerrdialogs',
                '--disable-gpu'
            ]
        });
    }

    async getTweets(username, count = DEFAULT_TWEET_COUNT) {
        return new Promise(async (resolve) => {
            try {
                let timeoutID = null;
                const page = await this.browser.newPage();
                await page.setRequestInterception(true);

                logger.info('Getting tweets for account:', username);

                page.on('request', (request) => request.continue());
                page.on('response', async (response) => {
                    const tweets = await this.handleResponse(response, username, count);
                    if (tweets) {
                        clearTimeout(timeoutID);
                        await page.close();
                        logger.debug('Closing and sending');
                        resolve(tweets);
                    }
                });

                page.goto(`${TWITTER_BASE_URL}/${username}`);
                logger.debug('Going to page!');

                timeoutID = setTimeout(async () => {
                    logger.warn('Timeout reached for account:', username);
                    await page.close();
                    resolve([]);
                }, TIMEOUT_DURATION);
            } catch (error) {
                logger.error('Error getting tweets for account:', username);
                logger.error(error.message);
                resolve([]);
            }
        });
    }

    handleResponse(response, username, count) {
        return new Promise(async (resolve) => {
            try {
                const url = response.url();
                if (url.includes(TWITTER_API_URL) && url.includes(TWITTER_TWEET_TAG_URL)) {
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
                    resolve(tweets.slice(0, count));
                } else {
                    resolve(null);
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
            tweets.push(this.parser.parse(tweet));
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
            tweets.push(this.parser.parse(tweet));
        }
    }

    processTimelineModule(entry, tweets) {
        const tweetsModule = entry.content.items;
        const tweet = tweetsModule[0].item.itemContent.tweet_results?.result;
        if (tweet) {
            tweets.push(this.parser.parse(tweet));
        }
    }
}

module.exports = { TweetParser, TwitterWrapper };