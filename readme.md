# Game Watcher

Game Watcher is a Discord bot designed to monitor and announce game releases and news. It integrates with platforms like Steam and Twitter to fetch the latest updates and ensures that your Discord community stays informed about upcoming and newly released games.

## Features

- **Slash Command Handling**: Manage and execute various slash commands for interacting with the bot.
- **News Fetching**: Retrieve the latest news from Steam's internal and external feeds.
- **Release Announcements**: Schedule and send announcements for game releases using cron jobs.
- **Permission Management**: Ensure only administrators can execute certain commands.
- **Auto-Complete**: Provide auto-complete suggestions for game names during interactions.
- **Logging**: Comprehensive logging for monitoring bot activities and errors.

## Technologies Used

- **Node.js**
- **Discord.js**
- **Axios**
- **Cron**
- **Joi** for configuration validation
- **Chalk** for colored console logs

## Installation

1. **Clone the Repository**
    ```sh
    git clone https://github.com/Xoin-devs/GameWatcher
    cd game-watcher
    ```

2. **Install Dependencies**
    ```sh
    npm install
    ```

3. **Configure Environment Variables**
    - Create `.env.dev` and `.env.prod` files based on the provided templates.
    - Example `.env.dev`:
        ```
        LOG_LEVEL=INFO

        DISCORD_TOKEN= 
        DISCORD_CLIENT_ID=

        DB_HOST=
        DB_USER=
        DB_PASSWORD=
        DB_NAME=
        DB_PORT=
        ```

## Usage

### Development

Start the bot in development mode:
```
npm run start:dev
```

### Production
Start the bot in production mode:
```
npm run start:prod
```

### Deploy Commands
Deploy slash commands for development:
```
npm run deployCommands:dev
```

Deploy slash commands for production:
```
npm run deployCommands:prod
```

### Database Migration
Previous version was using JSON files to store data with `config.js` class. The new version uses SQLite database from `database.js` to store data. To migrate data from JSON files to SQLite database, run the following commands: 

Migrate data for development:
```
npm run migrate:dev
```

Migrate data for production:
```
npm run migrate:prod
```

### Project Structure
```
.
├── .env.dev
├── .env.prod
├── .gitignore
├── app/
│   ├── commands/
│   │   ├── configuration/
│   │   │   ├── addGame.js
│   │   │   ├── getGame.js
│   │   │   ├── here.js
│   │   │   ├── removeGame.js
│   │   │   └── updateGame.js
│   │   └── utility/
│   │       └── ping.js
│   ├── constants/
│   │   ├── commandsName.js
│   │   ├── commandsOption.js
│   │   ├── discordConstants.js
│   │   ├── prettyColors.js
│   │   ├── sourceType.js
│   │   ├── steamFeedType.js
│   │   └── timeConstants.js
│   ├── events/
│   │   ├── interactionCreate.js
│   │   └── ready.js
│   ├── watchers/
│   │   ├── steamExternalWatcher.js
│   │   ├── steamInternalWatcher.js
│   │   ├── twitterWatcher.js
│   │   ├── watcher.js
│   │   └── watcherManager.js
│   ├── wrappers/
│   │   ├── steamExternalWrapper.js
│   │   ├── steamInternalWrapper.js
│   │   └── twitterWrapper.js
│   ├── app.js
│   ├── client.js
│   ├── commandDeployer.js
│   ├── commandHandler.js
│   ├── commandHelper.js
│   ├── config.js
│   ├── database.js
│   ├── logger.js
│   ├── messageUtil.js
│   ├── releaseManager.js
│   └── utils.js
├── scripts/
│   └── migration.js
├── ecosystem.config.js
├── package.json
└── README.md
```

### Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.