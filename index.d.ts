export declare type LoggerChannelCfg = {
    active?: boolean;
    severity?: number;
};
export declare type LoggerData = {
    channel: string;
    severity: number;
    time: Date;
    data: any;
};
export declare type LoggerConfig = {
    [name: string]: LoggerChannelCfg;
};
export declare type LoggerFunc = (...args: any[]) => string | void;
export declare type Logger = {
    [name: string]: LoggerFunc;
};
export declare const LEVELS: {
    debug: number;
    info: number;
    warn: number;
    error: number;
    fatal: number;
};
export declare const defaultConfig: LoggerConfig;
export declare const mergeWithDefaultConfig: (cfg: LoggerConfig) => {
    [x: string]: LoggerChannelCfg;
};
export declare const createDebugLogger: (ch: string, severity?: number) => LoggerFunc;
export declare const createLogger: (cfg: LoggerConfig) => Logger;
export default createLogger;
