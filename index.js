"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
//  ---------------------------------
const severityLevels = {
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
/**
 * Checks if mixin is valid for the channel and returns it, or null if not
 *
 * @param {string} channel - channel like 'info' or 'error'
 * @param {LoggerMixin} [ext] - optional logging data extender
 * @returns {(MixinFunc|Object|null)}
 */
const mixin4Channel = (channel, ext) => {
    return ((ext?.channels === '*' ||
        ext?.channels === 'all' ||
        ext?.channels === channel || (Array.isArray(ext?.channels) && (ext?.channels.includes('*') ||
        ext?.channels.includes('all') ||
        ext?.channels.includes(channel)))) && ext.mixin) || null;
};
/**
 * Builds logging function
 *
 * @param {string} channel - channel like 'info' or 'error'
 * @param {LoggerMixin} [ext] - optional logging data extender
 * @returns {LoggerFunc}
 */
const buildLogFunc = (channel, ext) => {
    const severity = severityLevels[channel] || 10;
    const out = severity > 30 ? process.stderr : process.stdout;
    const mixin = mixin4Channel(channel, ext);
    // mixin not provided or not valid for this channel
    if (!mixin) {
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
    // mixin is a function
    if (typeof mixin === 'function') {
        return (...args) => {
            const msg = JSON.stringify(mixin({
                channel: channel.toUpperCase(),
                severity,
                time: Date.now(),
                messages: [...args],
            }));
            out.write(msg + '\n');
            return msg;
        };
    }
    // mixin is a plain object
    return (...args) => {
        const msg = JSON.stringify({
            channel: channel.toUpperCase(),
            severity,
            time: Date.now(),
            ...mixin,
            messages: [...args],
        });
        out.write(msg + '\n');
        return msg;
    };
};
/**
 * Parses env variable LOG(LOGGER,DEBUG),  and returns list of active channels
 *
 * @param {LoggerConfig} cfg - logger config
 * @returns {string[]}
 */
const activeChannelsList = (cfg) => {
    const env = process.env;
    const envParams = env['LOG'] || env['LOGGER'] || env['DEBUG'];
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
                if (severityLevels[channel]) {
                    Object.keys(hash).forEach(ch => hash[ch] = severityLevels[ch] >= severityLevels[channel]);
                }
            }
            else {
                // create/activate channel
                hash[channel] = true;
            }
        }
    });
    return Object.keys(hash).filter(k => hash[k]);
};
/**
 * Creates logger from config and mixin
 *
 * @param {LoggerConfig} [config] - logger config, optional
 * @param {LoggerMixin} [mix] - mixin, optional
 * @returns {Logger}
 */
const createLogger = (config = defaultConfig, mix) => {
    const dummyFunc = () => { };
    const channels = activeChannelsList({ ...defaultConfig, ...config });
    const wildChannels = channels.filter(ch => ch.endsWith('*')).map(ch => ch.slice(0, -1));
    const logger = {
        // returns channel with the given name
        channel: function (ch) {
            const func = logger[ch];
            if (func && func !== dummyFunc) {
                return func;
            }
            // channel not found, checks wilds - channels ending with '*'
            const found = wildChannels.find(wch => ch.startsWith(wch));
            return found ? buildLogFunc(ch, mix) : dummyFunc;
        }
    };
    channels.forEach(ch => logger[ch] = buildLogFunc(ch, mix));
    // the Proxy allows call non-existent channels: if channel doesn't exist it invokes dummy func
    const handler = {
        get: (target, prop) => target[prop] || dummyFunc
    };
    return new Proxy(logger, handler);
};
exports.createLogger = createLogger;
//  ---------------------------------
exports.default = exports.createLogger;
