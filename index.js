"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.createDebugLogger = exports.mergeWithDefaultConfig = exports.defaultConfig = exports.LEVELS = void 0;
//  ----------------------------------------------------------------------------------------------//
exports.LEVELS = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50
};
exports.defaultConfig = {
    info: { active: true, severity: exports.LEVELS.info },
    warn: { active: true, severity: exports.LEVELS.warn },
    error: { active: true, severity: exports.LEVELS.error },
    fatal: { active: true, severity: exports.LEVELS.fatal }
};
//  mainly for testing
var mergeWithDefaultConfig = function (cfg) {
    var merged = __assign({}, exports.defaultConfig);
    Object.entries(cfg).forEach(function (_a) {
        var ch = _a[0], channel = _a[1];
        merged[ch] = __assign(__assign({}, (merged[ch] || { active: true, severity: exports.LEVELS.debug })), channel);
    });
    return merged;
};
exports.mergeWithDefaultConfig = mergeWithDefaultConfig;
//  ---------------------------------
var buildLogFunc = function (chName, channel) {
    if (channel.active === false) {
        return function () { };
    }
    if (channel.severity > 30) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var msg = JSON.stringify({
                channel: chName.toUpperCase(),
                severity: channel.severity,
                time: Date.now(),
                messages: __spreadArrays(args),
            } /*, null, 2*/);
            process.stderr.write(msg + '\n');
            return msg;
        };
    }
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var msg = JSON.stringify({
            channel: chName.toUpperCase(),
            severity: channel.severity,
            time: Date.now(),
            messages: __spreadArrays(args),
        } /*, null, 2*/);
        process.stdout.write(msg + '\n');
        return msg;
    };
};
//  env variables recognized in the following forms
//    LOG=-info,-warn,+debug  <-- "-" sign to deactivate, "+" or absence vice versa
//    LOG=* | LOG=all         <-- all channels active
//    LOG=*,-debug,-request   <-- all channels except debug and request
//    LOG=warn+               <-- set lowest severity level
var parseEnv = function (cfg, envName) {
    if (envName === void 0) { envName = 'LOG'; }
    var envParams = process.env[envName];
    if (!envParams) {
        return cfg;
    }
    envParams.split(',').forEach(function (par) {
        if (par.startsWith('-')) {
            par = par.slice(1);
            if (par === '*' || par === 'all') {
                Object.values(cfg).forEach(function (ch) { return ch.active = false; });
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
                Object.values(cfg).forEach(function (ch) { return ch.active = true; });
            }
            else if (cfg[par]) {
                cfg[par].active = true;
            }
            else if (par.endsWith('+')) {
                par = par.slice(0, -1);
                if (exports.LEVELS[par]) {
                    Object.values(cfg).forEach(function (ch) { return ch.active = ch.severity >= exports.LEVELS[par]; });
                }
            }
        }
    });
    return cfg;
};
var createDebugLogger = function (ch, severity) {
    var _a;
    if (severity === void 0) { severity = exports.LEVELS.debug; }
    var cfg = parseEnv((_a = {}, _a[ch] = { active: false, severity: severity }, _a), 'DEBUG');
    return buildLogFunc(ch, cfg[ch]);
};
exports.createDebugLogger = createDebugLogger;
var createLogger = function (cfg) {
    cfg = parseEnv(exports.mergeWithDefaultConfig(cfg), 'LOG');
    return Object.entries(cfg).reduce(function (logger, _a) {
        var chName = _a[0], channel = _a[1];
        logger[chName] = buildLogFunc(chName, channel);
        return logger;
    }, {});
};
exports.createLogger = createLogger;
exports.default = exports.createLogger;
