# Game Watcher Frontend

Game Watcher is a Discord bot designed to monitor and announce game releases and news. It integrates with platforms like Steam and Twitter to fetch the latest updates and ensures that your Discord community stays informed about upcoming and newly released games.

This repository contains the frontend code for the Game Watcher Discord bot. It's a dashboard that allows users to manage the bot's configuration for owned servers. It allows users to subscribe to game announcements. 

## Features

TODO

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express**: Web framework for Node.js.
- **MariaDB**: Database management system.
- **Passport**: Authentication middleware for Node.js.
- **EJS**: Embedded JavaScript templating.
- **dotenv**: Module to load environment variables from a `.env` file.
- **chalk**: Terminal string styling.
- **connect-sqlite3**: SQLite3 session store for Express.
- **cross-env**: Cross-platform environment setting.

## Installation

1. **Clone the Repository**
    ```sh
    git clone https://github.com/ElBartt/GameWatcher_Front.git
    cd game-watcher
    ```

2. **Install Dependencies**
    ```sh
    npm install
    ```

3. **Configure Your Bot**
    - Create a new Discord application on the [Discord Developer Portal](https://discord.com/developers/applications).
    - Create a bot for the application and copy the client ID and secret.
        - if your bot is already created you can find the client ID and secret in the OAuth2 tab.
    - Create a new OAuth2 callback URL
        - For local development, use `http://localhost:3000/auth/discord/callback`.

4. **Configure Environment Variables**
    - Create `.env.dev` and `.env.prod` files based on the provided templates.
    - Example `.env.dev`:
        ```
        LOG_LEVEL=INFO

        DISCORD_TOKEN=
        DISCORD_CLIENT_ID=
        DISCORD_CLIENT_SECRET=
        DISCORD_CALLBACK_URL=

        SESSION_SECRET= # Random string for session encryption
        
        WEB_PORT=

        DB_HOST=
        DB_USER=
        DB_PASSWORD=
        DB_NAME=
        DB_PORT=
        ```

## Usage

### Development

Start the front in development mode:
```
npm run start:dev
```

### Project Structure
```
TODO
```

### Contributing
Contributions are welcome! Please fork the repository and submit a pull request for any enhancements or bug fixes.