module.exports = {
    apps: [
        {
            name: 'gamewatcher-bot',
            script: 'app/app.js',
            args: '',
            instances: 1,
            autorestart: true,
            watch: false,
            env: {
                NODE_ENV: 'dev'
            },
            env_production: {
                NODE_ENV: 'prod'
            }
        }
    ]
};