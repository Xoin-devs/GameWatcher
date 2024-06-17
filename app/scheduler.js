const cron = require('node-cron');
const storage = require('node-persist');
const client = require('./client.js');
const { readConfig } = require('./config.js');
const MessageUtil = require('./messageUtil.js');
const logger = require('./logger');

class Scheduler {
    static async init() {
        await storage.init();
        let jobs = await this.getJobs();

        jobs = this.cleanUpJobs(jobs);

        await this.setJobs(jobs);

        for (const job of jobs) {
            for (const reminder of job.reminders) {
                this.scheduleMessage(job.releaseDate, reminder.date, job.channelIds, reminder.message, false);
            }
        }

        const config = readConfig();

        for (const game of config.games) {
            if (game.releaseDate) {
                this.scheduleGameRemindersIfNeeded(jobs, config.guilds, game);
            }
        }
    }

    static async getJobs() {
        return await storage.getItem('jobs') || [];
    }

    static async setJobs(jobs) {
        await storage.setItem('jobs', jobs);
    }

    static cleanUpJobs(jobs) {
        const now = new Date();
        return jobs.map(job => {
            job.reminders = job.reminders.filter(reminder => new Date(reminder.date) > now);
            return job;
        }).filter(job => job.reminders.length > 0);
    }

    static async scheduleMessage(releaseDate, dateString, channelIds, message, add = true) {
        const date = new Date(dateString);
        if (date <= new Date()) return;

        const cronExpression = this.getCronExpression(date);
        logger.info(`Scheduling message: ${message} at ${date}`);

        cron.schedule(cronExpression, async () => {
            await this.sendMessageToChannels(channelIds, message, releaseDate);
            await this.removeSentReminder(releaseDate, dateString, message);
        });

        if (add) {
            await this.addJob(releaseDate, dateString, channelIds, message);
        }
    }

    static getCronExpression(date) {
        return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    }

    static async sendMessageToChannels(channelIds, message, releaseDate) {
        for (const channelId of channelIds) {
            const channel = client.channels.cache.get(channelId);
            if (channel) {
                const embed = MessageUtil.createReleaseMessage(message, this.toDiscordTimestamp(releaseDate), message);
                try {
                    await channel.send({ embeds: [embed] });
                    logger.info(`Sent message to channel ${channelId}: ${message}`);
                } catch (error) {
                    logger.error(`Failed to send message to channel ${channelId}: ${error.message}`);
                }
            } else {
                logger.error(`Channel not found: ${channelId}`);
            }
        }
    }

    static async removeSentReminder(releaseDate, dateString, message) {
        let jobs = await this.getJobs();
        jobs = jobs.map(job => {
            if (job.releaseDate === releaseDate) {
                job.reminders = job.reminders.filter(reminder => reminder.date !== dateString || reminder.message !== message);
            }
            return job;
        }).filter(job => job.reminders.length > 0);
        await this.setJobs(jobs);
    }

    static async addJob(releaseDate, dateString, channelIds, message) {
        let jobs = await this.getJobs();
        let job = jobs.find(job => job.releaseDate === releaseDate);
        if (!job) {
            job = { releaseDate, channelIds, reminders: [] };
            jobs.push(job);
        }
        job.reminders.push({ date: dateString, message });
        await this.setJobs(jobs);
    }

    static async scheduleGameRemindersIfNeeded(jobs, guilds, game) {
        const existingJob = jobs.find(job => job.reminders.some(reminder => reminder.message.includes(game.name)));
        if (!existingJob) {
            logger.info(`Scheduling reminders for game: ${game.name}`);
            const channelIds = guilds.map(guild => guild.channelId);
            await this.scheduleReminders(game.releaseDate, channelIds, game.name);
        }
    }

    static async scheduleReminders(baseReleaseDate, channelIds, game) {
        const releaseDate = new Date(baseReleaseDate);

        const reminders = [
            { offset: -7, message: `One week until the release of ${game}!` },
            { offset: -3, message: `Three days until the release of ${game}!` },
            { offset: -1, message: `Tomorrow is the release of ${game}!` },
        ];

        for (const reminder of reminders) {
            const reminderDate = this.calculateDateOffset(releaseDate, reminder.offset);
            await this.scheduleMessage(releaseDate.toISOString(), reminderDate, channelIds, reminder.message);
        }

        logger.info(`Scheduled reminders for ${game} on ${releaseDate}`);
    }

    static calculateDateOffset(baseDate, offsetDays) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + offsetDays);
        return date.toISOString();
    }

    static toDiscordTimestamp(baseDate) {
        const date = new Date(baseDate);
        return `<t:${Math.floor(date.getTime() / 1000)}:D>`;
    }

    static async cancelJobsForGame(game) {
        let jobs = await this.getJobs();
        jobs = jobs.map(job => {
            job.reminders = job.reminders.filter(reminder => !reminder.message.includes(game));
            return job;
        }).filter(job => job.reminders.length > 0);
        await this.setJobs(jobs);
        logger.info(`Cancelled jobs for game: ${game}`);
    }
}

module.exports = Scheduler;
