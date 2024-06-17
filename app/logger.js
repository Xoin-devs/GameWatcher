const path = require('path');
const chalk = require('chalk');

class Logger {
    constructor() {
        this.levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        this.currentLevel = process.env.LOG_LEVEL || 'INFO';
        this.colors = {
            'DEBUG': '#389038',
            'INFO': '#3A6F9E',
            'WARN': '#FFA200',
            'ERROR': '#D30000',
            'DATE': '#803273',
            'CALLER': '#AEB2B5',
        };
    }

    log(level = 'INFO', ...args) {
        if (this.levels.indexOf(level) >= this.levels.indexOf(this.currentLevel)) {
            const timestamp = chalk.hex(this.colors['DATE'])(new Date().toLocaleTimeString());
            const levelColored = chalk.hex(this.colors[level])(level);
            const caller = chalk.hex(this.colors['CALLER'])(this.getCallerFile());
            const message = chalk.hex(this.colors[level])(args.join(' '));
            console.log(`[${timestamp}] [${levelColored}] [${caller}]: ${message}`);
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
        const caller = stack[2];
        return `${path.basename(caller.getFileName())}:${caller.getLineNumber()}`;
    }
}

module.exports = new Logger();