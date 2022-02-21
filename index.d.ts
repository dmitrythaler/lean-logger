export declare type LoggerData = {
    channel: string;
    severity: number;
    time: number;
    data: any[];
};
export declare type LoggerConfig = Record<string, boolean>;
declare type Keyed<T = unknown> = Record<string, T>;
export declare type LoggerFunc = (...args: any[]) => string | void;
export declare type LoggerFuncGen = (ch: string) => LoggerFunc;
export declare type Logger = {
    channel: LoggerFuncGen;
} & Record<string, LoggerFunc>;
export declare type InjectFunc = (LoggerData: any) => LoggerData & Keyed;
export declare type LoggerExt = {
    channels: string | string[];
    inject: Keyed | InjectFunc;
};
export declare const createLogger: (config?: LoggerConfig, ext?: LoggerExt) => Logger;
export default createLogger;
