# lean-logger
Lean-logger is a nodejs logger, doing only logging, only json to only console, very lean with no dependencies.

## Why (the heck another logger lib)?
There are 2 main reasons:

  0. A single global logging level (from `trace` to `error`) isn't enough for any non-trivial application. What if your database layer has bugs and needs `debug` or `trace` to diagnose them, while the rest of the app only needs `warn`? Typically, you set something like `LOG=trace` and drown in gigabytes of logs. Even worse, what if different modules *constantly* need different verbosity levels? We all know the usual answer: crank logging to the max and put up with tons of noise - and wasted thousands in log storage.
  1. In the modern containerized world, a logging library should do one thing: [write to the console](https://12factor.net/logs). Log routing, storage, and processing should be handled by telemetry systems (like OpenTelemetry, Fluentd, and/or the ELK stack) or container orchestration tools (like Kubernetes, Docker, or Nomad).

## So ...
The solution is simple: this library introduces logging "channels" - like a separate loggers for different parts of your application, each with its own verbosity level, independently configured via config in code or via environment dynamically.

```typescript
import {
  createLogger,
  type Channel,
  type Logger,
  type LoggerConfig,
  // type LogLevel,
  // type LoggerData,
} from 'lean-logger';

// LoggerConfig is optional parameter, there is always one default channel, always on, working traditional way - { default: 'info' }
const logger: Logger = createLogger({
  // set separate leve for every channel
  default: 'warn',
  db: 'debug',
  auth: 'trace',
});

// ...
logger.info('Service started');
logger.error('Failed to start service, fatal error', error.toString());

// somewhere in DAL module
const dbLog: Channel = logger.getChannel('db');
dbLog.warn('Database query took longer than expected', { duration });
dbLog.info('Database connection established');
dbLog.trace('Query executed:', q);

// somewhere in payments module
const pmtsLog: Channel = logger.getChannel('payments');
pmtsLog.info('Payment processed successfully', response);
pmtsLog.debug('Payment data', paymentData);
pmtsLog.fatal('Payment processing failed', pmtError);

// somewhere in auth module
const authLog: Channel = logger.getChannel('auth');
authLog.info('User authenticated', uid);
authLog.debug('User auth data', userData);
authLog.warn('User data has invalid signature', userData, signature);
```
...which prints:
```json
{"channel":"DEFAULT","level":"INFO","time":"2025-07-12T11:56:10.979Z","messages":["Service started"]}
{"channel":"DEFAULT","level":"ERROR","time":"2025-07-12T11:56:10.980Z","messages":["Failed to start service, fatal error","Error: Shit happens"]}
{"channel":"DB","level":"WARN","time":"2025-07-12T11:56:10.980Z","messages":["Database query took longer than expected",{"duration":"890ms"}]}
{"channel":"DB","level":"INFO","time":"2025-07-12T11:56:10.980Z","messages":["Database connection established"]}
{"channel":"AUTH","level":"INFO","time":"2025-07-12T11:56:10.980Z","messages":["User authenticated","user123"]}
{"channel":"AUTH","level":"DEBUG","time":"2025-07-12T11:56:10.980Z","messages":["User auth data",{"name":"John Doe","email":"john@doe.com"}]}
{"channel":"AUTH","level":"WARN","time":"2025-07-12T11:56:10.980Z","messages":["User data has invalid signature",{"name":"John Doe","email":"john@doe.com"},"abc123signature"]}
```
2 points from the above:
- the `logger` already contains default channel, so you don't need to get it separately;
- the `payments` channel is not declared in the config, so `logger.getChannel('payments')` returns a silent channel by default. It can be enabled at runtime via `LOG=payments:info` without changing code.

## Attaching channels as logger properties

A convenient pattern is to cast the logger and attach channels directly as named properties, giving you a single object to pass around:

```typescript
const logger = createLogger({ default: 'warn', dal: 'debug', http: 'info', aws: 'warn' }) as Logger & Record<string, Channel>

logger.dal  = logger.getChannel('dal')
logger.http = logger.getChannel('http')
logger.aws  = logger.getChannel('aws')

// then anywhere in your code:
logger.aws.warn('S3 bucket not found', { bucket });
logger.dal.debug('Query executed', { sql, duration });
logger.http.info('Request received', { method, path });
logger.error('Unhandled exception', err);  // default channel still on the root
```

The cast `as Logger & Record<string, Channel>` is needed because TypeScript doesn't know about the dynamically added properties — the runtime behavior is plain object assignment.

## To configure via environment

It allows you to dynamically change the verbosity level for any channel - or toggle channels on and off entirely - by setting the `LOG` (or `LOGGER`) environment variable:
```
LOG=<channel>:<level>,<channel>:<level>,...
```
The `default` channel name can be omitted or set as an empty string or `*`, so the below lines mean the same:
```console
LOG=info,db:debug,auth:trace
LOG=:info,db:debug,auth:trace
LOG=*:info,db:debug,auth:trace
```
The environment configuration takes precedence, so if you set:
```console
LOG=info,db:silent,auth:trace,payments
```
then the `db` channel will be silenced despite `debug` level in the code, and the `payments` channels will get `info` level and will start to print.


## To Extend/Update channels' data

```typescript
const logger: Logger = createLogger({ default: 'warn', ... },
  // mixin parameter, static
  {
    pid: process.pid,
    service: 'LAX-AIR-MON-12'
  });
```
... which adds to output:
```json
{"channel":"AUTH","level":"WARN","time":"2025-07-12T12:53:36.268Z","pid":252753,"service":"LAX-AIR-MON-12","messages":["User data has invalid signature",{"name":"John Doe","email":"john@doe.com"},"abc123signature"]}
```
Same way you can use function for mixin parameter:
```typescript
const logger: Logger = createLogger({ default: 'warn', ... },
  // mixin parameter, function
  (data) => ({
    ...data, // spread original data to preserve fields
    pid: process.pid,
    service: 'LAX-AIR-MON-12',
    messages: [...data.messages, 'Bender was here']
  })
);
```
... which updates output:
```json
{"channel":"AUTH","level":"WARN","time":"2025-07-12T13:01:47.094Z","messages":["User data has invalid signature",{"name":"John Doe","email":"john@doe.com"},"abc123signature","Bender was here"],"pid":253077,"service":"LAX-AIR-MON-12"}
```


## Bits and pieces
### Async output
The lib uses `process.stdout|stderr` internally, so logging is asynchronous.

### Incorrect level names
In the case of mistyped level name - default channel gets `info` level, any other - `silent`.

### Channel severity
Log calls at `error` and `fatal` levels output to `stderr`; everything else goes to `stdout`.

### Colored output
For colored printing, pls install `jq` then run your app like
```console
node dist/server.js 2>&1 | jq -c -R 'fromjson?'
```
That `2>&1` part combines `stdout` and `stderr`, and the `... -R 'fromjson?'` lets `jq` to ignore non-json output in case you have one.

