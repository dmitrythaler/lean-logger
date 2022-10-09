# lean-logger
Lean-logger is a nodejs logger, doing only logging, only json to only console. It's configurable mainly with ENV variables. 0-dependency, 0-bullshit and based on [The Twelve-Factor App](https://12factor.net/logs) methodology. <br/>

Also I think that the "severity levels" approach is suitable only to very simple application: it is clear for everyone that "severity" of the `error` message is higher than that of `info` or `silly`, so we can control them by setting that level to show only messages with "equal" or "bigger" levels.
But it is not so easy to separate when for ex. one needs to show database layer messages and keep silent stripe library messages - both types are about debug/info level. What of them are "bigger"? How to hide one and show another?

That's why this logger does not contain levels at all - there are channels. The channel should be explicitly set as "active" via ENV var or config to output anything. Default channels are `info`, `warn`, `error` and `fatal` - they, on the contrary, should be explicitly silenced.

So ...
## To Install
```bash
npm i -S lean-logger
# or
yarn add lean-logger
```
## To Use
```javascript
import { createLogger } from 'lean-logger'
const logger = createLogger()
...
  logger.warn('Hi there, got some issue', someIssueData)
  logger.info('It\'s ok now', someData)
  logger.debug('Debug info', process.env)
  ...
```
which prints
```console
{"channel":"WARN","time":1629615224513,"messages":["Hi there, got some issue",{...someIssueData}]}
{"channel":"INFO","time":1629615224513,"messages":["It's ok now",{...someData}]}
```
`logger.debug` prints nothing as it's inactive by default

## To Config
Empty configuration means these defaults:
```javascript
const logger = createLogger({
  channels: {
    info: true,
    warn: true,
    error: true,
    fatal: true
  }
})
```
This default configuration is being merged with that provided by user, so
```javascript
const logger = createLogger({
  http: true,
  request: true
})
```
implicitly results in
```javascript
const logger = createLogger({
  channels: {
    info: true,
    warn: true,
    error: true,
    fatal: true,
    http: true,
    request: true
  }
})
```
If you want to silence default channel, e.g. `info` - you'll need to do it explicitly, like
```javascript
const logger = createLogger({
  channels: {
    info: false,
    warn: false,
    stripe: true
  }
})
```

## To print to non-existent channels
The logger can be used with any channel, including never defined:
```javascript
const logger = createLogger()
// ... somewhere later
logger.noSuchChannel(req.ip, req.method, req.originalUrl, res.statusCode)
logger.confession('I like Old Grand-Dad Bourbon', url)
```
They output nothing and they don't throw anything like `TypeError: "confession" is not a function`. So one needs not to bother with including all possible channels in the configuration - they can be activated any time with environment variable or just kept them silent.

## To configure with ENV
Use `LOG` env variable to manage logging
```console
LOG=(+|-|)(channelName|all),(+|-|)(channelName|all|*),... node your-app
```
"-" sign to deactivate channel, "+" or nothing to activate<br />
"all" or "*" means all default channels, only makes sense with "-"

```console
LOG=* node your-app
LOG=all node your-app
```
all default channels active(no need to do so)

```console
LOG=*,+debug node your-app
LOG=+debug node your-app
LOG=debug node your-app
```
All default channels and debug active, so `logger.debug(...)` will work

```console
LOG=-all,error,fatal node your-app
```
All default channels deactivated except error and fatal

```console
LOG=-info,-warn,+http node your-app
```
Default channels without info and warn plus http channel

```console
LOG=-all,confession node your-app
```
Default channels all dead but now everyone knows you like Bourbon.

## To Extract channel and set active channels "wildly*"
```javascript
import { createLogger } from 'lean-logger'
const logger = createLogger({ ... })
// extract channel to separate func
const logMigration = logger.getChannel('migration')
// ... somewhere
logMigration(`Migration ${name}, table ${table}, ${rNum} records`, someData, ...blah)
```
This is particularly useful combined with wild channel activation:
```javascript
const logger = createLogger({ ... })
const logCard = logger.getChannel('square:card')
const logPayment = logger.getChannel('square:pmnt')
const logRefund = logger.getChannel('square:rfnd')
// ... somewhere
logCard(`User ${uid}, card updated ${cardId}, ...`, ...blah)
// ...
logPayment(`User ${uid}, card ${cardId}, payment successful...`, ...blah)
// ...
logRefund(`User ${uid}, card ${cardId}, payment ${pmntId} cancelled...`, ...blah)
```
To see only e.g. payments one has to activate
```console
LOG=square:pmnt node your-app
```
Samely for only cards update:
```console
LOG=square:card node your-app
```
And to see all logs for the `square` module it's enough to set
```console
LOG=square:* node your-app
```
## To Extend/Update channels' data
```javascript
const logger = createLogger({
  channels: {
    // ...
  },
  mix: {
    channels: '*', // string or string[], channel name(s) or '*' or 'all'
    mixin: { service: 'AUTH-SERVICE' }
  })
// ... somewhere
logger.info(`User ${uid}, password updated`, ...blah)
```
now it outputs
```console
{"channel":"INFO","service":"AUTH-SERVICE","time":1629615224513,"messages":["User XYZ, password upfated",{...blah}]}

```
The `mix` config parameter can be object or function that receives LoggerData and process it arbitrary way.

## Bits and pieces
### Async output
Those `logger.anything...` methods use `process.stdout|stderr` internally, so they are asynchronous.
### Channel severity
Channels named `error`, `fatal` and `fuckup` output to `stderr`.<br/>
(shouldn't it be configurable?)

### Colored output
For debug fancy printing install `jq` then update your dev scripts in `package.json` like this
```json
    "dev": "NODE_ENV=development ts-node-dev --no-notify src/server.ts",
    "dev:jq": "yarn dev 2>&1 | jq -c -R 'fromjson?'",
```
That `2>&1` part combines `stdout` and `stderr`, and the `... -R 'fromjson?'` lets `jq` to ignore non-json output.

