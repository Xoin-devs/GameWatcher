module.exports = {
    apps: [
        {
            name: 'game-watcher',
            script: 'app/app.js',
            args: '',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'dev'
            },
            env_production: {
                NODE_ENV: 'prod'
            }
        }
    ]
};