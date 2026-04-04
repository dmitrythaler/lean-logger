export type LogLevel = 'info' | 'warn' | 'error' | 'fatal' | 'debug' | 'trace' | 'silly' | 'silent'

export type LoggerData = {
  channel: string,
  level: LogLevel,
  time: Date,
  messages: any[]
}

type LoggerFunc = (...args: any[]) => void
type Mixer = (data: Record<string, unknown>) => Record<string, unknown>
type Mixin = Record<string, unknown> | Mixer

export type Channel = Record<LogLevel, LoggerFunc>
type ChannelGen = (channelName?: string) => Channel
export type Logger = {
  getChannel: ChannelGen
} & Channel

export type LoggerConfig = Record<string, LogLevel>

process.on('exit', () => {
  try { (process.stdout as any)._handle?.setBlocking(true) } catch {}
  try { (process.stderr as any)._handle?.setBlocking(true) } catch {}
})

//  ---------------------------------

const levelSeverities: Record<LogLevel, number> = {
  silent: 666,
  fatal: 30,
  error: 25,
  warn: 20,
  info: 15,
  debug: 10,
  trace: 5,
  silly: 1,
}

const dummyFunc: LoggerFunc = () => {}
const dummyChannel: Channel = {
  silent: dummyFunc,
  fatal: dummyFunc,
  error: dummyFunc,
  warn: dummyFunc,
  info: dummyFunc,
  debug: dummyFunc,
  trace: dummyFunc,
  silly: dummyFunc,
}


const mergeEnvToConfig = (conf: LoggerConfig): LoggerConfig => {
  const { LOG, LOGGER } = process.env
  const envParams = LOG || LOGGER || ''
  const config: LoggerConfig = {
    default: 'info',
    ...conf
  }

  envParams.split(',').forEach(channelAndLevel => {
    let [channel, level] = channelAndLevel.split(':').map(s => s.trim())
    if (levelSeverities[channel]) {
      level = channel
      channel = 'default'
    } else {
      level = level || 'info'
      if (!channel || channel === '*') {
        channel = 'default'
      }
    }
    if (levelSeverities[level] === undefined) {
      console.warn(JSON.stringify({
        channel: 'DEFAULT',
        level: 'WARN',
        time: new Date(),
        messages: [`Unknown log level "${level}" for channel "${channel}". ${channel === 'default' ? 'Set to "info".' : 'Skipped.'}`],
      }))
      if (channel === 'default') {
        config.default = 'info'
      }
    } else {
      config[channel] = level as LogLevel
    }
  })
  return config
}

const buildLogFunc = (channel: string, level: LogLevel, threshold: LogLevel, mixin?: Mixin): LoggerFunc => {

  if (levelSeverities[level] < levelSeverities[threshold] || level === 'silent') {
    return dummyFunc
  }

  const out = levelSeverities[level] > levelSeverities.warn ? process.stderr : process.stdout

  if (!mixin) {
    return (...args: any[]) => {
      const msg = JSON.stringify({
        channel: channel.toUpperCase(),
        level: level.toUpperCase(),
        time: new Date(),
        messages: [...args],
      }/*, null, 2*/)
      out.write(msg + '\n')
    }
  }

  // mixin is a function
  if (typeof mixin === 'function') {
    return (...args: any[]) => {
      const msg = JSON.stringify(mixin({
        channel: channel.toUpperCase(),
        level: level.toUpperCase(),
        time: new Date(),
        messages: [...args],
      }))
      out.write(msg + '\n')
    }
  }

  // mixin is a plain object
  return (...args: any[]) => {
    const msg = JSON.stringify({
      channel: channel.toUpperCase(),
      level: level.toUpperCase(),
      time: new Date(),
      ...mixin,
      messages: [...args],
    })
    out.write(msg + '\n')
  }
}

/**
 * Creates logger from config and mixin
 *
 * @param [config] - logger config
 * @param [mix] - optional mixin to extend log data
 * @returns {Logger}
 */
export const createLogger = (config: LoggerConfig = {}, mix?: Mixer | Record<string, unknown>): Logger => {
  config = mergeEnvToConfig(config)
  const getChannel = (channelName?: string): Channel => {
    const threshold = config[channelName || 'default']
    if (!threshold || threshold === 'silent') {
      return dummyChannel
    }
    return (<LogLevel[]>Object.keys(levelSeverities)).reduce((channel: Channel, lvl: LogLevel) => {
      channel[lvl] = buildLogFunc(channelName || 'default', lvl, threshold, mix)
      return channel
    }, {} as Channel)
  }

  return {
    getChannel,
    ...getChannel('default')
  }
}

//  ---------------------------------
export default createLogger
