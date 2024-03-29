
export type LoggerData = {
  channel: string,
  severity: number,
  time: Date,
  data: any
}

export type LoggerConfig = Record<string, boolean>

export type LoggerFunc = (...args: any[]) => string | void
export type LoggerFuncGen = (ch: string) => LoggerFunc
export type Logger = {
  channel: LoggerFuncGen
} & Record<string, LoggerFunc>

//  ----------------------------------------------------------------------------------------------//
const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
}

const defaultConfig: LoggerConfig = {
  debug: false,
  info: true,
  warn: true,
  error: true,
  fatal: true
}

const defaultChannels = ['info', 'warn', 'error', 'fatal']

//  ---------------------------------
const buildLogFunc = (channel: string): LoggerFunc => {
  const severity = LEVELS[channel] || 10
  const out = severity > 30 ? process.stderr : process.stdout
  return (...args) => {
    const msg = JSON.stringify({
      channel: channel.toUpperCase(),
      severity,
      time: Date.now(),
      messages: [...args],
    }/*, null, 2*/)
    out.write(msg + '\n')
    return msg
  }
}

const injectEnv = (cfg: LoggerConfig, envName: string): string[] => {
  const envParams = process.env[envName]
  let hash = { ...cfg }
  if (!envParams) {
    return Object.keys(hash).filter(k => hash[k])
  }

  envParams.split(',').forEach(channel => {
    if (channel.startsWith('-')) {
      // starts with [-] - deactivate
      channel = channel.slice(1)
      if (channel === '*' || channel === 'all') {
        hash = {} as LoggerConfig
      } else if (hash[channel]) {
        hash[channel] = false
      }
    } else {
      // starts with [+] or nothing - activate
      if (channel.startsWith('+')) {
        channel = channel.slice(1)
      }
      if (channel === '*' || channel === 'all') {
        // all default channels
        defaultChannels.forEach(ch => hash[ch] = true)
      } else if (channel.endsWith('+')) {
        // channel in cfg ends with [+] means least severity level
        channel = channel.slice(0, -1)
        if (LEVELS[channel]) {
          Object.keys(hash).forEach(ch => hash[ch] = LEVELS[ch] >= LEVELS[channel])
        }
      } else {
        // create channel
        hash[channel] = true
      }
    }
  })
  return Object.keys(hash).filter(k => hash[k])
}

export const createLogger = (config = defaultConfig): Logger => {
  const dummyFunc = () => {}
  const channels = injectEnv({ ...defaultConfig, ...config }, 'LOG')
  const wildChannels = channels.filter(ch => ch.endsWith('*')).map(ch => ch.slice(0, -1))

  const logger = {
    channel: function (ch: string): LoggerFunc {
      const func = logger[ch]
      // console.log('+++ wilds', wildChannels, func)
      if (func && func !== dummyFunc) {
        return func
      }
      const found = wildChannels.find(wch => ch.startsWith(wch))
      return found ? buildLogFunc(ch) : dummyFunc
    }
  }

  channels.forEach(ch => logger[ch] = buildLogFunc(ch))
  const handler = {
    get: (target, prop) => target[prop] || dummyFunc
  }

  return new Proxy(logger, handler)
}

export default createLogger
