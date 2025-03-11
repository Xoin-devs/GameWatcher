# Game Watcher Monorepo

Game Watcher is a Discord bot designed to monitor and announce game releases and news. It integrates with platforms like Steam and Twitter to fetch the latest updates and ensures that your Discord community stays informed about upcoming and newly released games.

This repository contains the code for both the bot and the dashboard that allows users to manage the bot's configuration for owned servers. It allows users to subscribe to game announcements.

## Features

- **Slash Command Handling**: Manage and execute various slash commands for interacting with the bot.
- **News Fetching**: Retrieve the latest news from Steam's internal and external feeds.
- **Release Announcements**: Schedule and send announcements for game releases using cron jobs.
- **Permission Management**: Ensure only administrators can execute certain commands.
- **Auto-Complete**: Provide auto-complete suggestions for game names during interactions.
- **Logging**: Comprehensive logging for monitoring bot activities and errors.
- **Dashboard**: Manage the bot's configuration and game subscriptions through a web interface.

## Technologies Used

- **Node.js**
- **Discord.js**
- **Axios**
- **Cron**
- **Joi** for configuration validation
- **Chalk** for colored console logs
- **Express**: Web framework for Node.js.
- **MariaDB**: Database management system.
- **Passport**: Authentication middleware for Node.js.
- **EJS**: Embedded JavaScript templating.
- **dotenv**: Module to load environment variables from a `.env` file.
- **connect-sqlite3**: SQLite3 session store for Express.
- **cross-env**: Cross-platform environment setting.

## Installation

1. **Clone the Repository**
    ```sh
    git clone https://github.com/your-repo/game-watcher-monorepo.git
    cd game-watcher-monorepo
    ```

2. **Install Dependencies**
    ```sh
    npm install
    ```
    
3. **Configure Environment Variables**
    - Create `.env.dev` and `.env.prod` files based on the provided templates.
    - Example `.env.dev`:
        ```
        LOG_LEVEL=DEBUG

        DISCORD_TOKEN=YOUR_DISCORD_TOKEN
        DISCORD_CLIENT_ID=YOUR_DISCORD_CLIENT_ID
        DISCORD_CLIENT_SECRET=YOUR_DISCORD_CLIENT_SECRET
        DISCORD_CALLBACK_URL=http://localhost:3000/auth/callback

        SESSION_SECRET=YOUR_SESSION_SECRET

        WEB_PORT=3000
        WEB_URL=http://localhost

        DB_HOST=YOUR_DB_HOST
        DB_USER=YOUR_DB_USER
        DB_PASSWORD=YOUR_DB_PASSWORD
        DB_NAME=gamewatcher_dev
        DB_PORT=3306

        API_PORT=8473
        API_ENDPOINT=http://localhost
        ```

4. **Configure Your Bot**
    - Create a new Discord application and bot from the [Discord Developer Portal](https://discord.com/developers/applications).
    - Copy the bot token and client ID for the `.env.dev` and `.env.prod` files.
        - If your bot is already created, you can find the client ID and secret in the OAuth2 tab.
    - In the Installation section
        - In context, only allow Guild install
        - Scopes should be `applications.commands` and `bot`
        - Permissions should be `Administrator` in develompent
        - Permissions should be `Attach Files`, `Send Messages`, `Embed Links`, `Send Messages in Threads`,`Use Slash Commands` in production
    - Create a new OAuth2 callback URL
        - For local development, use `http://localhost:3000/auth/callback`.
    - Add the bot to your server

## Usage

### Development

Start the bot in development mode:
```sh
npm run start:bot:dev
```

Start the dashboard in development mode:
```sh
npm run start:dashboard:dev
```

### Production

Start the bot in production mode:
```sh
npm run start:bot:prod
```

Start the dashboard in production mode:
```sh
npm run start:dashboard:prod
```

### Deploy Commands

Deploy slash commands for development:
```sh
npm run deployCommands:dev
```

Deploy slash commands for production:
```sh
npm run deployCommands:prod
```

### Build Scripts

build the api project:
```sh
npm run build:api
```

Build the bot project:
```sh
npm run build:bot
```

Build the dashboard project:
```sh
npm run build:dashboard
```

Build all projects:
```sh
npm run build:all
```

### Deployment Scripts

Deploy the api to a production environment:
```sh
npm run deploy:api --user USER_NAME --host IP --path FOLDER --password FOLDER
```

Deploy the bot to a production environment:
```sh
npm run deploy:bot --user USER_NAME --host IP --path FOLDER --password FOLDER
```

Deploy the dashboard to a production environment:
```sh
npm run deploy:dashboard --user USER_NAME --host IP --path FOLDER --password FOLDER
```

### Start deployed projects

install the npm packages for each project
```sh
npm install
```

each project use pm2 to start the project, so you can use the following command to start the project
```sh
pm2 start ecosystem.config.js --env production
```

### Project Structure

```
.
├── .env.dev
├── .env.prod
├── .gitignore
├── package.json
├── api/
├── bot/
│   ├── app/
│   │   ├── commands/
│   │   ├── constants/
│   │   ├── events/
│   │   ├── watchers/
│   │   ├── wrappers/
│   │   ├── app.js
│   │   ├── client.js
│   │   ├── commandDeployer.js
│   │   ├── commandHandler.js
│   │   ├── commandHelper.js
│   │   ├── config.js
│   │   ├── database.js
│   │   ├── logger.js
│   │   ├── messageUtil.js
│   │   ├── releaseManager.js
│   │   └── utils.js
│   ├── ecosystem.config.js
│   ├── package.json
│   └── readme.md
├── dashboard/
│   ├── app/
│   │   ├── public/
│   │   ├── views/
│   │   ├── app.js
│   │   ├── webServer.js
│   ├── package.json
│   └── readme.md
├── shared/
│   ├── config.js
│   ├── database.js
│   ├── logger.js
│   ├── prettyColors.js
│   └── timeConstants.js
└── README.md
```

### Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.