"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = void 0;
//  ---------------------------------
const defaultConfig = {
    info: true,
    warn: true,
    error: true,
    fatal: true
};
const errorChannels = ['error', 'fatal', 'fuckup'];
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
    const out = errorChannels.includes(channel) ? process.stderr : process.stdout;
    const mixin = mixin4Channel(channel, ext);
    // mixin not provided or not valid for this channel
    if (!mixin) {
        return (...args) => {
            const msg = JSON.stringify({
                channel: channel.toUpperCase(),
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
                Object.keys(defaultConfig).forEach(ch => hash[ch] = true);
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
const createLogger = (config = {}, mix) => {
    const dummyFunc = () => { };
    const channels = activeChannelsList({ ...defaultConfig, ...config });
    const wildChannels = channels.filter(ch => ch.endsWith('*')).map(ch => ch.slice(0, -1));
    const logger = {
        // returns channel with the given name
        getChannel: function (ch) {
            const func = this[ch];
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
