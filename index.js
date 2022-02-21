"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
//  ----------------------------------------------------------------------------------------------//
const LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50
};
const defaultConfig = {
    debug: false,
    info: true,
    warn: true,
    error: true,
    fatal: true
};
const defaultChannels = ['info', 'warn', 'error', 'fatal'];
//  ---------------------------------
const inject4Channel = (channel, ext) => {
    return ((ext?.channels === '*' ||
        ext?.channels === 'all' ||
        ext?.channels === channel || (Array.isArray(ext?.channels) && (ext?.channels.includes('*') ||
        ext?.channels.includes('all') ||
        ext?.channels.includes(channel)))) && ext.inject) || null;
};
const buildLogFunc = (channel, ext) => {
    const severity = LEVELS[channel] || 10;
    const out = severity > 30 ? process.stderr : process.stdout;
    const inject = inject4Channel(channel, ext);
    if (!inject) {
        return (...args) => {
            const msg = JSON.stringify({
                channel: channel.toUpperCase(),
                severity,
                time: Date.now(),
                messages: [...args],
            } /*, null, 2*/);
            out.write(msg + '\n');
            return msg;
        };
    }
    if (typeof inject === 'function') {
        return (...args) => {
            const msg = JSON.stringify(inject({
                channel: channel.toUpperCase(),
                severity,
                time: Date.now(),
                messages: [...args],
            }));
            out.write(msg + '\n');
            return msg;
        };
    }
    return (...args) => {
        const msg = JSON.stringify({
            channel: channel.toUpperCase(),
            severity,
            time: Date.now(),
            ...inject,
            messages: [...args],
        });
        out.write(msg + '\n');
        return msg;
    };
};
const injectEnv = (cfg, envName) => {
    const envParams = process.env[envName];
    let hash = { ...cfg };
    if (!envParams) {
        return Object.keys(hash).filter(k => hash[k]);
    }
    envParams.split(',').forEach(channel => {
        if (channel.startsWith('-')) {
            // starts with [-] - deactivate
            channel = channel.slice(1);
            if (channel === '*' || channel === 'all') {
                hash = {};
            }
            else if (hash[channel]) {
                hash[channel] = false;
            }
        }
        else {
            // starts with [+] or nothing - activate
            if (channel.startsWith('+')) {
                channel = channel.slice(1);
            }
            if (channel === '*' || channel === 'all') {
                // all default channels
                defaultChannels.forEach(ch => hash[ch] = true);
            }
            else if (channel.endsWith('+')) {
                // channel in cfg ends with [+] means least severity level
                channel = channel.slice(0, -1);
                if (LEVELS[channel]) {
                    Object.keys(hash).forEach(ch => hash[ch] = LEVELS[ch] >= LEVELS[channel]);
                }
            }
            else {
                // create channel
                hash[channel] = true;
            }
        }
    });
    return Object.keys(hash).filter(k => hash[k]);
};
const createLogger = (config = defaultConfig, ext) => {
    const dummyFunc = () => { };
    const channels = injectEnv({ ...defaultConfig, ...config }, 'LOG');
    const wildChannels = channels.filter(ch => ch.endsWith('*')).map(ch => ch.slice(0, -1));
    const logger = {
        channel: function (ch) {
            const func = logger[ch];
            if (func && func !== dummyFunc) {
                return func;
            }
            const found = wildChannels.find(wch => ch.startsWith(wch));
            return found ? buildLogFunc(ch, ext) : dummyFunc;
        }
    };
    channels.forEach(ch => logger[ch] = buildLogFunc(ch, ext));
    const handler = {
        get: (target, prop) => target[prop] || dummyFunc
    };
    return new Proxy(logger, handler);
};
exports.createLogger = createLogger;
exports.default = exports.createLogger;
