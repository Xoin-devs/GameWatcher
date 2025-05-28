# Game News Forge - Repository Custom Instructions

## Project Overview

**Game News Forge** is a comprehensive Discord bot ecosystem that tracks game releases and provides automated news updates. The project follows a microservices architecture with three main components: Bot, API, and Dashboard, all sharing common utilities through a shared module system.

### Core Technologies
- **Node.js** - Runtime environment
- **Discord.js** - Discord API integration
- **Express.js** - Web framework (API & Dashboard)
- **MariaDB** - Primary database
- **PM2** - Production process management
- **EJS** - Server-side templating
- **Passport** - OAuth authentication

## Architecture Overview

### 1. Microservices Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Discord Bot   │    │   RESTful API   │    │   Dashboard     │
│   (Port: N/A)   │    │   (Port: 8080)  │    │   (Port: 3000)  │
│                 │    │                 │    │                 │
│ • Commands      │    │ • Game CRUD     │    │ • Web UI        │
│ • Event Handlers│◄──►│ • Session Mgmt  │◄──►│ • OAuth Login   │
│ • News Watchers │    │ • Subscription  │    │ • Game Mgmt     │
│ • Schedulers    │    │   Management    │    │ • Hexagonal     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Shared Module  │
                    │                 │
                    │ • Database      │
                    │ • Config        │
                    │ • Logger        │
                    │ • Utilities     │
                    └─────────────────┘
```

### 2. Dashboard Hexagonal Architecture
The dashboard follows hexagonal (ports and adapters) architecture:

```
Core Domain ◄─── Application Services ◄─── Adapters
     │                    │                   │
 Entities            Use Cases          Controllers
 Ports               Services           Repositories
                                       Middleware
```

**Key Directories:**
- `core/domain/` - Business entities and ports
- `core/application/` - Use cases and services
- `adapters/in/` - Web controllers and view models
- `adapters/out/` - Database and external service adapters

## Project Structure

```
GameWatcher/
├── api/                    # RESTful API service
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   └── utils/         # API utilities
│   └── tests/             # Comprehensive test suite
├── bot/                   # Discord bot service
│   ├── app/
│   │   ├── commands_public/    # User commands
│   │   ├── commands_private/   # Admin commands
│   │   ├── events/            # Discord event handlers
│   │   ├── watchers/          # News monitoring
│   │   ├── services/          # Bot business logic
│   │   └── constants/         # Bot configuration
│   └── assets/           # Static resources
├── dashboard/            # Web dashboard (Hexagonal)
│   └── app/
│       ├── core/         # Domain layer
│       ├── adapters/     # Infrastructure layer
│       ├── config/       # App configuration
│       ├── public/       # Frontend assets
│       └── views/        # EJS templates
├── shared/               # Common utilities
│   ├── database.js       # Singleton DB manager
│   ├── config.js         # Environment config
│   └── logger.js         # Centralized logging
├── deploy/               # Production builds
└── scripts/              # Build and deployment
```

## Development Guidelines

### 1. Code Style Standards

#### JavaScript
```javascript
// ✅ Use const/let, not var
const gameId = interaction.options.getString('game_id');
let isSubscribed = false;

// ✅ Arrow functions for anonymous functions
const games = guildGames.filter(game => game.subscribed);

// ✅ Template literals
const message = `Game "${gameName}" added successfully!`;

// ✅ Always use semicolons
await interaction.reply({ content: message });
```

#### File Naming Conventions
- **Classes**: PascalCase (`GameController.js`, `DatabaseManager.js`)
- **Functions/Variables**: camelCase (`getUserGames`, `isSubscribed`)
- **Constants**: UPPER_SNAKE_CASE (`SOURCE_TYPE`, `COMMAND_NAMES`)
- **Files**: kebab-case for components (`game-list.js`), PascalCase for classes

#### CSS Guidelines
```css
/* ✅ Descriptive class names */
.game-card, .subscription-toggle, .server-list-item

/* ✅ Avoid IDs for styling */
/* ❌ #gameCard */
/* ✅ .game-card */

/* ✅ Logical property order */
.game-card {
    /* Layout */
    display: flex;
    position: relative;
    
    /* Box model */
    width: 100%;
    padding: 1rem;
    margin: 0.5rem 0;
    
    /* Visual */
    background-color: #252525;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}
```

### 2. Architecture Patterns

#### Singleton Pattern (Database)
```javascript
class DatabaseManager {
    static instance = null;
    
    static async getInstance() {
        if (!this.instance) {
            this.instance = new DatabaseManager();
            await this.instance.init();
        }
        return this.instance;
    }
}
```

#### Service Layer Pattern
```javascript
// ✅ Service handles business logic
class GameService {
    async toggleGameSubscription(guildId, gameId) {
        // Validation
        this.validateIds(guildId, gameId);
        
        // Business logic
        const isSubscribed = await this.repository.isSubscribed(guildId, gameId);
        
        if (isSubscribed) {
            await this.repository.unsubscribe(guildId, gameId);
        } else {
            await this.repository.subscribe(guildId, gameId);
        }
        
        return { subscribed: !isSubscribed };
    }
}
```

#### Command Pattern (Discord Bot)
```javascript
module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-game')
        .setDescription('Add a game to watch'),
    
    async execute(interaction) {
        // Command implementation
    },
    
    async autocomplete(interaction) {
        // Autocomplete logic
    }
};
```

### 3. Error Handling Standards

#### API Layer
```javascript
// ✅ Centralized error handling
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    logger.error(`[${req.requestId}] ${err.message}`);
    res.sendError(err.message, statusCode);
});

// ✅ Custom error types
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.status = 404;
    }
}
```

#### Bot Layer
```javascript
// ✅ Graceful Discord interaction handling
try {
    await interaction.reply({ content: 'Success!' });
} catch (error) {
    logger.error(`Command error: ${error.message}`);
    
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
            content: 'An error occurred!', 
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            content: 'An error occurred!', 
            ephemeral: true 
        });
    }
}
```

### 4. Database Patterns

#### Safe Query Execution
```javascript
async _safeQuery(query, params = [], errorMessage = 'Database query error') {
    try {
        const [results] = await this.pool.execute(query, params);
        return results;
    } catch (error) {
        logger.error(`${errorMessage}: ${error.message}`);
        throw error;
    }
}
```

#### Transaction Handling
```javascript
async createGameWithSubscription(gameName, gameObject, guildId) {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    
    try {
        // Create game
        const gameResult = await connection.execute(
            'INSERT INTO games (name, release_date) VALUES (?, ?)',
            [gameName, gameObject.releaseDate]
        );
        
        // Subscribe guild
        await connection.execute(
            'INSERT INTO guild_games (guild_id, game_id) VALUES (?, ?)',
            [guildId, gameResult.insertId]
        );
        
        await connection.commit();
        return { game: gameResult };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
```

### 5. Testing Standards

#### Test Structure
```
tests/
├── unit/           # Isolated component tests
├── integration/    # Component interaction tests
└── e2e/           # End-to-end API tests
```

#### Test Patterns
```javascript
describe('GameService', () => {
    beforeEach(() => {
        // Setup mocks
        jest.clearAllMocks();
    });
    
    describe('toggleGameSubscription', () => {
        it('should subscribe guild when not subscribed', async () => {
            // Arrange
            mockRepository.isSubscribed.mockResolvedValue(false);
            
            // Act
            const result = await gameService.toggleGameSubscription('123', '456');
            
            // Assert
            expect(result.subscribed).toBe(true);
            expect(mockRepository.subscribe).toHaveBeenCalledWith('123', '456');
        });
    });
});
```

### 6. Environment Configuration

#### Multi-Environment Setup
```javascript
// shared/config.js
const environment = process.env.NODE_ENV || 'dev';
const config = require(`../.env.${environment}`);

module.exports = {
    isProd: () => environment === 'prod',
    isDev: () => environment === 'dev',
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        // ...
    }
};
```

#### Module Aliasing
```javascript
// package.json
"_moduleAliases": {
    "@shared": "./shared",
    "@bot": "./bot/app",
    "@api": "./api/src"
}

// Usage
const logger = require('@shared/logger');
const utils = require('@bot/utils');
```

### 7. Deployment Patterns

#### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'gamewatcher-bot',
        script: 'app/app.js',
        instances: 1,
        autorestart: true,
        watch: false,
        env: { NODE_ENV: 'dev' },
        env_production: { NODE_ENV: 'prod' }
    }]
};
```

#### Build Process
- Automatic dependency merging from root and project
- Module alias configuration
- Environment-specific builds
- Production optimization

### 8. Security Guidelines

#### Content Security Policy
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "https://cdn.discordapp.com"]
        }
    }
}));
```

#### Input Validation
```javascript
// ✅ Always validate and sanitize inputs
const guildId = String(req.params.guildId); // Ensure string type
const gameId = parseInt(req.params.gameId, 10); // Ensure integer

if (!guildId || isNaN(gameId)) {
    return res.sendError('Invalid parameters', 400);
}
```

### 9. Logging Standards

#### Structured Logging
```javascript
// ✅ Include context in logs
logger.info(`User ${interaction.user.tag} executed command ${commandName} in guild ${guildId}`);

// ✅ Log errors with full context
logger.error(`Database query failed: ${error.message}`, {
    query: query,
    params: params,
    stack: error.stack
});

// ✅ Use appropriate log levels
logger.debug('Detailed debugging info');
logger.info('General information');
logger.warn('Warning conditions');
logger.error('Error conditions');
```

### 10. API Design Guidelines

#### RESTful Conventions
```javascript
// ✅ Resource-based URLs
GET    /api/guilds/:guildId/games          # Get guild games
POST   /api/guilds/:guildId/games/:gameId  # Subscribe to game
DELETE /api/guilds/:guildId/games/:gameId  # Unsubscribe from game

// ✅ Consistent response format
{
    "success": true,
    "data": { /* response data */ },
    "message": "Operation completed successfully"
}

// ✅ Error responses
{
    "success": false,
    "message": "Validation failed",
    "statusCode": 400,
    "errors": { /* field-specific errors */ }
}
```

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add game subscription toggle functionality
fix: resolve database connection timeout issue
docs: update API documentation
style: format code with Prettier
refactor: improve performance of game fetching
test: add unit tests for GameService
chore: update dependencies
```

## Development Workflow

### 1. Local Development
```bash
# Start services
npm run start:bot:dev      # Discord bot
npm run start:api:dev      # API server
npm run start:dashboard:dev # Dashboard

# Deploy commands
npm run deployCommands:dev
```

### 2. Production Deployment
```bash
# Build projects
npm run build:all

# Deploy to VPS
npm run deploy:bot --user USER --host IP --path FOLDER
npm run deploy:api --user USER --host IP --path FOLDER
npm run deploy:dashboard --user USER --host IP --path FOLDER

# Start with PM2
pm2 start ecosystem.config.js --env production
```

### 3. Testing
```bash
# Run tests
npm test                   # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # End-to-end tests only
```

## Key Principles

1. **Separation of Concerns**: Each service has a distinct responsibility
2. **Dependency Injection**: Use constructor injection for testability
3. **Error Handling**: Always handle errors gracefully with user feedback
4. **Logging**: Comprehensive logging for debugging and monitoring
5. **Testing**: Maintain high test coverage (80%+ target)
6. **Security**: Input validation, CSP, secure headers
7. **Performance**: Efficient database queries, caching where appropriate
8. **Maintainability**: Clean code, proper documentation, consistent patterns

## Common Anti-Patterns to Avoid

❌ **Direct database access in controllers**
```javascript
// Bad
async getGames(req, res) {
    const db = await DatabaseManager.getInstance();
    const games = await db.getGames();
    res.json(games);
}
```

✅ **Use service layer**
```javascript
// Good
async getGames(req, res) {
    const games = await this.gameService.getGames();
    res.sendSuccess(games);
}
```

❌ **Hardcoded values**
```javascript
// Bad
if (user.role === 'admin') // Hardcoded role
```

✅ **Use configuration**
```javascript
// Good
if (user.role === config.roles.ADMIN)
```

❌ **Silent error handling**
```javascript
// Bad
try {
    await riskyOperation();
} catch (error) {
    // Silent failure
}
```

✅ **Proper error handling**
```javascript
// Good
try {
    await riskyOperation();
} catch (error) {
    logger.error(`Operation failed: ${error.message}`);
    throw new ApplicationError('Operation failed', 500);
}
```

This document should be referenced for all development work on the Game News Forge project to ensure consistency, maintainability, and adherence to established patterns.
