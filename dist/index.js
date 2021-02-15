import { inspect } from 'util';
import fs from 'fs';
//  ---------------------------------
const streamsHash = {};
const getStream = (fileName) => {
    if (!streamsHash[fileName]) {
        streamsHash[fileName] = fs.createWriteStream(fileName, { flags: 'a' });
        streamsHash[fileName].on('error', err => {
            console.error(`LeanLogger, file transport, error writing to ${fileName}: ${err.toString()}`);
        });
    }
    return streamsHash[fileName];
};
//  ---------------------------------
export const defaultConfig = {
    opts: {
        depth: 4,
        showHidden: false
    },
    formatters: {
        'console': (_) => {
            _.message = _.data.reduce((m, d) => m + (typeof (d) === 'object' && d != null && !(d instanceof Date) ? inspect(d) + '\n' : d + ' '), `${_.time.toISOString().slice(0, -5)} ${_.channel.toUpperCase()}: `);
            return _;
        },
        'json': (_) => {
            _.message = JSON.stringify({
                channel: _.channel.toUpperCase(),
                time: _.time.getTime(),
                messages: _.data,
                ..._.dataBound
            } /*, null, 2*/);
            return _;
        }
    },
    transports: {
        'stdout': (_) => {
            process.stdout.write(_.message + '\n');
            return _;
        },
        'stderr': (_) => {
            process.stderr.write(_.message + '\n');
            return _;
        },
        'file': (_) => {
            if (!_.stream) {
                _.stream = getStream(_.opts.fileName);
            }
            _.stream.write(_.message + '\n');
            return _;
        }
    },
    channels: {
        info: { transports: ['stdout'], formatter: 'console' },
        warn: { transports: ['stdout'], formatter: 'console' },
        error: { transports: ['stderr'], formatter: 'console' }
    }
};
//  ---------------------------------
const validateMergeConfig = (cfg) => {
    //  merge ...
    const merged = {
        opts: { ...defaultConfig.opts, ...cfg.opts },
        transports: { ...defaultConfig.transports, ...cfg.transports },
        formatters: { ...defaultConfig.formatters, ...cfg.formatters },
        channels: { ...defaultConfig.channels, ...cfg.channels },
    };
    //  ...then validate
    Object.entries(merged.channels).forEach(([chName, channel]) => {
        if (!channel.transports) {
            throw new Error(`LeanLogger error, channel "${chName}" contains no transports.`);
        }
        channel.transports.forEach(trName => {
            if (!merged.transports[trName]) {
                throw new Error(`LeanLogger error, channel "${chName}" contains invalid transport name "${trName}".`);
            }
            if (trName === 'file' && (!channel.opts || !channel.opts.fileName)) {
                throw new Error(`LeanLogger error, channel "${chName}" has type "file" and contains no file name.`);
            }
        });
        if (!merged.formatters[channel.formatter]) {
            throw new Error(`LeanLogger error, channel "${chName}" contains invalid formatter name "${channel.formatter}".`);
        }
    });
    return merged;
};
//  ----------------------------------------------------------------------------------------------//
const pipe = (...fns) => fns.reduce((prev, curr) => prev ? par => curr(prev(par)) : curr, null);
const dummyLogger = () => { };
const buildLogFunc = (cfg, chName, channel) => {
    if (channel.active === false) {
        return dummyLogger;
    }
    const pipeline = pipe(cfg.formatters[channel.formatter], ...channel.transports.map(tr => cfg.transports[tr]));
    return (...args) => pipeline({
        channel: chName,
        opts: { ...cfg.opts, ...channel.opts },
        time: new Date(),
        data: [...args],
        dataBound: channel.dataBound
    }).message;
};
export const createLogger = (cfg) => {
    cfg = validateMergeConfig(cfg);
    //  env variables recognized in two forms
    //    LOG=-info,-warn,+debug  <-- the "+" sign is optional
    //    LOG=*                   <-- all channels active
    const env = process.env;
    const envParams = env.LEANLOGGER || env.LOGGER || env.LOG;
    if (envParams) {
        if (envParams === '*') {
            Object.values(cfg.channels).forEach(ch => ch.active = true);
        }
        else {
            envParams.split(',').forEach(par => {
                const ch = par.startsWith('-') || par.startsWith('+') ? par.slice(1) : par;
                if (cfg.channels[ch]) {
                    cfg.channels[ch].active = !par.startsWith('-');
                }
            });
        }
    }
    return Object.entries(cfg.channels).reduce((loggr, [chName, channel]) => {
        loggr[chName] = buildLogFunc(cfg, chName, channel);
        return loggr;
    }, {});
};
export default createLogger;
