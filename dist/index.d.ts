/// <reference types="node" />
import type { WriteStream } from 'fs';
import type * as utilTypes from 'util';
export declare type InspectOptions = utilTypes.InspectOptions;
export declare type LoggerChannelCfg = {
    transports: string[];
    formatter: string;
    active?: boolean;
    opts?: InspectOptions & {
        fileName?: string;
    };
    dataBound?: any;
};
export declare type LoggerData = {
    channel: string;
    opts: InspectOptions & {
        fileName?: string;
    };
    time: Date;
    data: any;
    message?: string;
    stream?: WriteStream;
    dataBound?: any;
};
export declare type LoggerFunc = (_: LoggerData) => LoggerData;
export declare type LoggerConfig = {
    opts?: InspectOptions;
    formatters?: {
        [name: string]: LoggerFunc;
    };
    transports?: {
        [name: string]: LoggerFunc;
    };
    channels: {
        [name: string]: LoggerChannelCfg;
    };
};
export declare type Logger = {
    [name: string]: (...args: any[]) => string | void;
};
export declare const defaultConfig: LoggerConfig;
export declare const createLogger: (cfg: LoggerConfig) => Logger;
export default createLogger;
