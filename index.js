//  ----------------------------------------------------------------------------------------------//
export const LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50
};
export const defaultConfig = {
    info: { active: true, severity: LEVELS.info },
    warn: { active: true, severity: LEVELS.warn },
    error: { active: true, severity: LEVELS.error },
    fatal: { active: true, severity: LEVELS.fatal }
};
//  mainly for testing
export const mergeWithDefaultConfig = (cfg) => {
    const merged = { ...defaultConfig };
    Object.entries(cfg).forEach(([ch, channel]) => {
        merged[ch] = {
            ...(merged[ch] || { active: true, severity: LEVELS.debug }),
            ...channel
        };
    });
    return merged;
};
//  ---------------------------------
const buildLogFunc = (chName, channel) => {
    if (channel.active === false) {
        return () => { };
    }
    if (channel.severity > 30) {
        return (...args) => {
            const msg = JSON.stringify({
                channel: chName.toUpperCase(),
                severity: channel.severity,
                time: Date.now(),
                messages: [...args],
            } /*, null, 2*/);
            process.stderr.write(msg + '\n');
            return msg;
        };
    }
    return (...args) => {
        const msg = JSON.stringify({
            channel: chName.toUpperCase(),
            severity: channel.severity,
            time: Date.now(),
            messages: [...args],
        } /*, null, 2*/);
        process.stdout.write(msg + '\n');
        return msg;
    };
};
//  env variables recognized in the following forms
//    LOG=-info,-warn,+debug  <-- "-" sign to deactivate, "+"(or nothing) vice versa
//    LOG=* | LOG=all         <-- all channels active
//    LOG=*,-debug,-request   <-- all channels except debug and request
//    LOG=warn+               <-- set lowest severity level
//    DEBUG=module:db         <-- debug logger
//    DEBUG=module:*          <-- all debug loggers starting with "module:"
const parseEnv = (cfg, envName = 'LOG') => {
    const envParams = process.env[envName];
    if (!envParams) {
        return cfg;
    }
    envParams.split(',').forEach(par => {
        if (par.startsWith('-')) {
            par = par.slice(1);
            if (par === '*' || par === 'all') {
                Object.values(cfg).forEach(ch => ch.active = false);
            }
            else if (cfg[par]) {
                cfg[par].active = false;
            }
        }
        else {
            if (par.startsWith('+')) {
                par = par.slice(1);
            }
            if (par === '*' || par === 'all') {
                Object.values(cfg).forEach(ch => ch.active = true);
            }
            else if (cfg[par]) {
                cfg[par].active = true;
            }
            else if (par.endsWith('+')) {
                par = par.slice(0, -1);
                if (LEVELS[par]) {
                    Object.values(cfg).forEach(ch => ch.active = ch.severity >= LEVELS[par]);
                }
            }
            else if (par.endsWith('*')) {
                par = par.slice(0, -1);
                const pl = par.length;
                Object.entries(cfg).forEach(([name, ch]) => ch.active = name.slice(0, pl) === par);
            }
        }
    });
    return cfg;
};
export const createDebugLogger = (ch, severity = LEVELS.debug) => {
    const cfg = parseEnv({ [ch]: { active: false, severity } }, 'DEBUG');
    return buildLogFunc(ch, cfg[ch]);
};
export const createLogger = (cfg) => {
    cfg = parseEnv(mergeWithDefaultConfig(cfg), 'LOG');
    return Object.entries(cfg).reduce((logger, [chName, channel]) => {
        logger[chName] = buildLogFunc(chName, channel);
        return logger;
    }, {});
};
export default createLogger;
