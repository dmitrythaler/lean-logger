export declare type LoggerData = {
    channel: string;
    severity: number;
    time: Date;
    data: any;
};
export declare type LoggerConfig = Record<string, boolean>;
export declare type LoggerFunc = (...args: any[]) => string | void;
export declare type LoggerFuncGen = (ch: string) => LoggerFunc;
export declare type Logger = {
    channel: LoggerFuncGen;
} & Record<string, LoggerFunc>;
export declare const createLogger: (config?: LoggerConfig) => Logger;
export default createLogger;
