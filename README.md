# lean-logger
Lean-logger is a nodejs logger, doing only logging, only json to only console. It's configurable mainly with ENV variables. 0-dependency, 0-bullshit and based on [The Twelve-Factor App](https://12factor.net/logs) methodology.

## Install
```bash
npm i -S lean-logger
# or
yarn add lean-logger
```
## Use
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
{"channel":"WARN","severity":30,"time":1629615224513,"messages":["Hi there, got some issue",{...someIssueData}]}
{"channel":"INFO","severity":20,"time":1629615224513,"messages":["It's ok now",{...someData}]}
```
`logger.debug` prints nothing as it's inactive by default

## Config
Empty configuration means these defaults:
```javascript
const logger = createLogger({
  debug: false,
  info: true,
  warn: true,
  error: true,
  fatal: true
})
```
This default configuration is being merged with that provided by user, so
```javascript
const logger = createLogger({
  http: true,
  request: true,
  info: false
})
```
implicitly results in
```javascript
const logger = createLogger({
  debug: false,
  info: false,
  warn: true,
  error: true,
  fatal: true,
  http: true,
  request: true
})
```
If you want to silence e.g. `info` channel you'll need to do it explicitly -
```javascript
const logger = createLogger({
  info: false
})
```
## Non-existent channels
The logger can be used with any channel, including non-existent:
```javascript
const logger = createLogger()
// ... somewhere later
logger.noSuchChannel(req.ip, req.method, req.originalUrl, res.statusCode)
logger.shrift('I like Old Grand-Dad Bourbon', url)
```
It outputs nothing and doesn't throw. Don't bother with including all possible channels in the configuration - you can activate it with environment variable.

## Configuration with ENV
Use `LOG` env variable to manage logging
```console
LOG=(+|-|)(channelName|all),(+|-|)(channelName|all|*),... node your-app
```
"-" sign to deactivate channel, "+" or nothing to activate<br />
"all" or "*" means all default channels, makes sense with "-"

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
LOG=-all,shrift node your-app
```
Default channels all dead but everyone knows you like Bourbon.

## Extract channel and "wild" activation
```javascript
import { createLogger } from 'lean-logger'
const logger = createLogger({ ... })
// extract channel to separate func
const logMigration = logger.channel('migration')
// ... somewhere
logMigration(`Migration ${name}, table ${table}, ${rNum} records`, someData, ...blah)
```
This is particularly useful combined with wild channel activation:
```javascript
const logger = createLogger({ ... })
const logCard = logger.channel('square:card')
const logPayment = logger.channel('square:pmnt')
const logRefund = logger.channel('square:rfnd')
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
## Extend channels
```javascript
const logger = createLogger({
  // ...
  }, {
    channels: '*', // string or string[], channel name(s) or '*' or 'all'
    inject: { service: 'AUTH-SERVICE' }
  })
// ... somewhere
logger.info(`User ${uid}, password updated`, ...blah)
```
now it outputs
```console
{"channel":"INFO","service":"AUTH-SERVICE","severity":20,"time":1629615224513,"messages":["User XYZ, password upfated",{...blah}]}

```
The `inject` param can be object or function that receives LoggerData and extends it with arbitrary info.

## Bits and pieces
### Channel severity
```
LOG=warn+
```
TBD...
### Colored output
For debug fancy printing install `jq` then update your dev scripts in `package.json` like this
```json
    "dev": "NODE_ENV=development ts-node-dev --no-notify src/server.ts",
    "dev:jq": "npm run dev 2>&1 | jq -c -R 'fromjson?'",
```
That `2>&1` part combines `stdout` and `stderr`, and the `... -R 'fromjson?'` lets `jq` to ignore non-json output.

