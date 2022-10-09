export type LoggerData = {
  channel: string,
  time: number,
  data: any[]
}

export type LoggerChannels = {
  getChannel?: never,
  [k: string]: boolean
}

type Keyed<T = unknown> = Record<string, T>

export type LoggerFunc = (...args: any[]) => string | void
export type LoggerFuncGen = (ch: string) => LoggerFunc
export type Logger = {
  getChannel: LoggerFuncGen
} & Keyed<LoggerFunc>

export type MixinFunc = (LoggerData) => LoggerData & Keyed
export type LoggerMixin = {
  channels: string | string[],
  mixin: Keyed | MixinFunc
}

export type LoggerConfig = {
  channels?: LoggerChannels,
  mix?: LoggerMixin
}

//  ---------------------------------

const defaultChannels: LoggerChannels = {
  info: true,
  warn: true,
  error: true,
  fatal: true
}

const errorChannels = ['error', 'fatal', 'fuckup']

/**
 * Checks if mixin is valid for the channel and returns it, or null if not
 *
 * @param {string} channel - channel like 'info' or 'error'
 * @param {LoggerMixin} [ext] - optional logging data extender
 * @returns {(MixinFunc|Object|null)}
 */
const mixin4Channel = (channel: string, mix?: LoggerMixin): null | Keyed | MixinFunc => {
  return (
    (
      mix?.channels === '*' ||
      mix?.channels === 'all' ||
      mix?.channels === channel || (
        Array.isArray(mix?.channels) && (
          mix?.channels.includes('*') ||
          mix?.channels.includes('all') ||
          mix?.channels.includes(channel)
        )
      )
    ) && mix.mixin
  ) || null
}

/**
 * Builds logging function
 *
 * @param {string} channel - channel like 'info' or 'error'
 * @param {LoggerMixin} [mix] - optional logging data extender
 * @returns {LoggerFunc}
 */
const buildLogFunc = (channel: string, mix?: LoggerMixin): LoggerFunc => {
  const out = errorChannels.includes(channel) ? process.stderr : process.stdout
  const mixin = mixin4Channel(channel, mix)

  // mixin not provided or not valid for this channel
  if (!mixin) {
    return (...args: any[]) => {
      const msg = JSON.stringify({
        channel: channel.toUpperCase(),
        time: Date.now(),
        messages: [...args],
      }/*, null, 2*/)
      out.write(msg + '\n')
      return msg
    }
  }

  // mixin is a function
  if (typeof mixin === 'function') {
    return (...args: any[]) => {
      const msg = JSON.stringify((mixin as MixinFunc)({
        channel: channel.toUpperCase(),
        time: Date.now(),
        messages: [...args],
      }))
      out.write(msg + '\n')
      return msg
    }
  }

  // mixin is a plain object
  return (...args: any[]) => {
    const msg = JSON.stringify({
      channel: channel.toUpperCase(),
      time: Date.now(),
      ...(mixin as Keyed),
      messages: [...args],
    })
    out.write(msg + '\n')
    return msg
  }
}

/**
 * Parses env variable LOG(LOGGER,DEBUG) and returns list of active channels
 *
 * @param {LoggerChannels} channels - logger channels hash
 * @returns {string[]}
 */
const activeChannelsList = (channels: LoggerChannels): string[] => {
  const env = process.env
  const envParams = env['LOG'] || env['LOGGER'] || env['DEBUG']
  let hash = { ...channels }
  if (!envParams) {
    return Object.keys(hash).filter(k => hash[k])
  }

  envParams.split(',').forEach(channel => {
    if (channel.startsWith('-')) {
      // starts with [-] - deactivate
      channel = channel.slice(1)
      if (channel === '*' || channel === 'all') {
        hash = {} as LoggerChannels
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
        Object.keys(defaultChannels).forEach(ch => hash[ch] = true)
      } else {
        // create/activate channel
        hash[channel] = true
      }
    }
  })
  return Object.keys(hash).filter(k => hash[k])
}

/**
 * Creates logger from config and mixin
 *
 * @param {LoggerConfig} [config] - logger config
 * @returns {Logger}
 */
export const createLogger = (config: LoggerConfig = {}): Logger => {
  const dummyFunc = () => {}
  const channels = activeChannelsList({ ...defaultChannels, ...config.channels } as LoggerChannels)
  const wildChannels = channels.filter(ch => ch.endsWith('*')).map(ch => ch.slice(0, -1))

  const logger = {
    // returns channel with the given name, if channel is not active then it
    getChannel: function (ch: string): LoggerFunc {
      const func = this[ch]
      if (func && func !== dummyFunc) {
        return func
      }
      // channel not found, checks wilds - channels ending with '*'
      const found = wildChannels.find(wch => ch.startsWith(wch))
      return found ? buildLogFunc(ch, config.mix) : dummyFunc
    }
  }

  channels.forEach(ch => logger[ch] = buildLogFunc(ch, config.mix))

  // the Proxy allows call non-existent channels: if channel doesn't exist it invokes dummy func
  const handler = {
    get: (target, prop) => target[prop] || dummyFunc
  }

  return new Proxy(logger, handler)
}

//  ---------------------------------
export default createLogger
