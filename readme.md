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
npm run deploy:api --user USER_NAME --host IP --path FOLDER --password PASSWORD
```

Deploy the bot to a production environment:
```sh
npm run deploy:bot --user USER_NAME --host IP --path FOLDER --password PASSWORD
```

Deploy the dashboard to a production environment:
```sh
npm run deploy:dashboard --user USER_NAME --host IP --path FOLDER --password PASSWORD
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
i:\_workspace_fourtou\Discord\GameWatcher\
├── .env.dev
├── .env.prod
├── .gitignore
├── package.json
├── package-lock.json
├── readme.md
├── todo.md
├── api/
│   ├── ecosystem.config.js
│   ├── package.json
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── controllers/
│       │   └── gameController.js
│       └── routes/
│           └── gameRoutes.js
├── bot/
│   ├── ecosystem.config.js
│   ├── package.json
│   ├── publish.bat
│   ├── app/
│   │   ├── app.js
│   │   ├── client.js
│   │   ├── commandDeployer.js
│   │   ├── commandHandler.js
│   │   ├── commandHelper.js
│   │   ├── messageUtil.js
│   │   ├── releaseManager.js
│   │   ├── utils.js
│   │   ├── webhookManager.js
│   │   ├── commands_private/
│   │   │   ├── configuration/
│   │   │   └── utility/
│   │   ├── commands_public/
│   │   │   └── configuration/
│   │   ├── constants/
│   │   │   ├── commandsName.js
│   │   │   ├── commandsOption.js
│   │   │   ├── discordConstants.js
│   │   │   ├── sourceType.js
│   │   │   └── steamFeedType.js
│   │   ├── events/
│   │   │   ├── guildDelete.js
│   │   │   ├── interactionCreate.js
│   │   │   └── ready.js
│   │   ├── utils/
│   │   └── watchers/
│   │       ├── steamExternalWatcher.js
│   │       ├── steamInternalWatcher.js
│   │       ├── twitterWatcher.js
│   │       ├── watcher.js
│   │       ├── watcherManager.js
│   │       └── wrappers/
│   │           ├── steamExternalWrapper.js
│   │           ├── steamInternalWrapper.js
│   │           └── twitterWrapper.js
│   ├── assets/
│   │   ├── icon_pc_gamer.png
│   │   ├── icon_pcgamesn.png
│   │   ├── icon_rps.png
│   │   ├── icon_steam.png
│   │   ├── icon_twitter.png
│   │   └── icon_VG247.png
│   └── storage/
│       └── 5d9a17cb70b9733aadc073a44c21889d33325874c51f9c0c461de3e61a2425eb
├── dashboard/
│   ├── ecosystem.config.js
│   ├── hexagonal-api.md
│   ├── hexagonal.md
│   ├── package.json
│   ├── sessions/
│   └── app/
│       ├── app.js
│       ├── webServer.js
│       ├── adapters/
│       │   ├── in/
│       │   │   └── web/
│       │   │       ├── AuthController.js
│       │   │       ├── GameController.js
│       │   │       ├── GuildController.js
│       │   │       ├── ErrorMiddleware.js
│       │   │       ├── Router.js
│       │   │       └── viewmodels/
│       │   │           ├── DashboardViewModel.js
│       │   │           └── GameViewModel.js
│       │   └── out/
│       │       ├── discord/
│       │       │   └── DiscordRepositoryImpl.js
│       │       └── persistence/
│       │           ├── GameRepositoryImpl.js
│       │           └── GuildMapper.js
│       ├── config/
│       │   ├── AuthConfig.js
│       │   └── SecurityConfig.js
│       ├── core/
│       │   ├── application/
│       │   │   ├── errors/
│       │   │   │   └── ApplicationErrors.js
│       │   │   ├── factories/
│       │   │   │   ├── ControllerFactory.js
│       │   │   │   └── ServiceFactory.js
│       │   │   └── services/
│       │   │       ├── GameService.js
│       │   │       ├── GuildService.js
│       │   │       └── UserService.js
│       │   └── domain/
│       │       ├── entities/
│       │       │   ├── Guild.js
│       │       │   ├── Pagination.js
│       │       │   └── Source.js
│       │       └── ports/
│       │           ├── in/
│       │           │   ├── GamePort.js
│       │           │   ├── GuildPort.js
│       │           │   └── UserPort.js
│       │           └── out/
│       │               ├── DiscordRepository.js
│       │               └── GameRepository.js
│       ├── img/
│       │   ├── game-news-forge-logo-favicon.png
│       │   └── game-news-forge-logo-light.png
│       ├── infrastructure/
│       │   ├── AppInitializer.js
│       │   └── WebServer.js
│       ├── public/
│       │   ├── css/
│       │   │   └── dashboard.css
│       │   └── js/
│       │       ├── adapters/
│       │       │   └── apiClient.js
│       │       ├── application/
│       │       │   └── gameService.js
│       │       ├── dashboard.js
│       │       ├── presentation/
│       │       │   ├── gameList.js
│       │       │   └── serverList.js
│       │       └── utils/
│       │           └── formatters.js
│       └── views/
│           ├── dashboard.ejs
│           ├── error.ejs
│           ├── login.ejs
│           └── pages/
│               ├── privacy_policy.ejs
│               └── terms_of_service.ejs
├── deploy/
│   ├── api/
│   │   ├── ecosystem.config.js
│   │   ├── package.json
│   │   ├── shared/
│   │   │   ├── config.js
│   │   │   ├── database.js
│   │   │   ├── logger.js
│   │   │   ├── prettyColors.js
│   │   │   └── timeConstants.js
│   │   └── src/
│   │       ├── app.js
│   │       ├── server.js
│   │       ├── controllers/
│   │       └── routes/
│   ├── bot/
│   │   ├── ecosystem.config.js
│   │   ├── package.json
│   │   ├── publish.bat
│   │   ├── readme.md
│   │   ├── app/
│   │   ├── assets/
│   │   ├── shared/
│   │   └── storage/
│   └── dashboard/
│       ├── ecosystem.config.js
│       ├── package.json
│       ├── sessions/
│       ├── app/
│       └── shared/
├── scripts/
│   ├── deploy.js
│   └── deployToVPS.js
└── shared/
    ├── config.js
    ├── database.js
    ├── logger.js
    ├── prettyColors.js
    └── timeConstants.js
```

### Contributing

Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.