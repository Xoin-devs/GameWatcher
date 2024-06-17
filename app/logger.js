const path = require('path');

class Logger {
    constructor() {
        this.levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        this.currentLevel = process.env.LOG_LEVEL || 'INFO';
    }

    log(level = 'INFO', ...args) {
        if (this.levels.indexOf(level) >= this.levels.indexOf(this.currentLevel)) {
            const timestamp = new Date().toISOString();
            const caller = this.getCallerFile();
            const message = args.join(' ');
            console.log(`[${timestamp}] [${level}] [${caller}]: ${message}`);
        }
    }

    error(...args) {
        this.log('ERROR', ...args);
    }

    warn(...args) {
        this.log('WARN', ...args);
    }

    info(...args) {
        this.log('INFO', ...args);
    }

    debug(...args) {
        this.log('DEBUG', ...args);
    }

    getCallerFile() {
        const originalFunc = Error.prepareStackTrace;

        Error.prepareStackTrace = function (_, stack) {
            return stack;
        };

        const err = new Error();
        Error.captureStackTrace(err, this.getCallerFile);

        const stack = err.stack;
        Error.prepareStackTrace = originalFunc;

        // stack[1] is this.getCallerFile()
        // stack[2] is our caller
        return path.basename(stack[2].getFileName());
    }
}

module.exports = new Logger();