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
} & Keyed<LoggerFunc>;
export declare type MixinFunc = (LoggerData: any) => LoggerData & Keyed;
export declare type LoggerMixin = {
    channels: string | string[];
    mixin: Keyed | MixinFunc;
};
/**
 * Creates logger from config and mixin
 *
 * @param {LoggerConfig} [config] - logger config, optional
 * @param {LoggerMixin} [mix] - mixin, optional
 * @returns {Logger}
 */
export declare const createLogger: (config?: LoggerConfig, mix?: LoggerMixin) => Logger;
export default createLogger;
