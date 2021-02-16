export type LoggerChannelCfg = {
  active?: boolean,
  severity?: number
}
export type LoggerData = {
  channel: string,
  severity: number,
  time: Date,
  data: any
}

export type LoggerConfig = {
  [name: string]: LoggerChannelCfg
}

export type LoggerFunc = (...args: any[]) => string | void
export type Logger = {
  [name: string]: LoggerFunc
}

//  ----------------------------------------------------------------------------------------------//
export const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50
}

export const defaultConfig: LoggerConfig = {
  info: { active: true, severity: LEVELS.info },
  warn: { active: true, severity: LEVELS.warn },
  error: { active: true, severity: LEVELS.error },
  fatal: { active: true, severity: LEVELS.fatal }
}

//  mainly for testing
export const mergeWithDefaultConfig = (cfg: LoggerConfig) => ({ ...defaultConfig, ...cfg })

//  ---------------------------------
const buildLogFunc = (chName: string, channel: LoggerChannelCfg): LoggerFunc => {
  if (channel.active === false) {
    return () => {}
  }
  if (channel.severity > 30) {
    return (...args) => {
      const msg = JSON.stringify({
        channel: chName.toUpperCase(),
        severity: channel.severity,
        time: Date.now(),
        messages: [...args],
      }/*, null, 2*/)
      process.stderr.write(msg + '\n')
      return msg
    }
  }

  return (...args) => {
    const msg = JSON.stringify({
      channel: chName.toUpperCase(),
      severity: channel.severity,
      time: Date.now(),
      messages: [...args],
    }/*, null, 2*/)
    process.stdout.write(msg + '\n')
    return msg
  }
}

//  env variables recognized in the following forms
//    LOG=-info,-warn,+debug  <-- "-" sign to deactivate, "+" or absence vice versa
//    LOG=* | LOG=all         <-- all channels active
//    LOG=*,-debug,-request   <-- all channels except debug and request
//    LOG=warn+               <-- set lowest severity level
const parseEnv = (cfg: LoggerConfig, envName = 'LOG'): LoggerConfig => {
  const envParams = process.env[envName]
  if (!envParams) {
    return cfg
  }
  envParams.split(',').forEach(par => {
    if (par.startsWith('-')) {
      par = par.slice(1)
      if (par === '*' || par === 'all') {
        Object.values(cfg).forEach(ch => ch.active = false)
      } else if (cfg[par]) {
        cfg[par].active = false
      }
    } else {
      if (par.startsWith('+')) {
        par = par.slice(1)
      }
      if (par === '*' || par === 'all') {
        Object.values(cfg).forEach(ch => ch.active = true)
      } else if (cfg[par]) {
        cfg[par].active = true
      } else if (par.endsWith('+')) {
        par = par.slice(0, -1)
        if (LEVELS[par]) {
          Object.values(cfg).forEach(ch => ch.active = ch.severity >= LEVELS[par])
        }
      }
    }
  })
  return cfg
}

export const createDebugLogger = (ch: string, severity = LEVELS.debug): LoggerFunc => {
  const cfg = parseEnv({ [ch]: { active: false, severity } }, 'DEBUG')
  return buildLogFunc(ch, cfg[ch])
}

export const createLogger = (cfg: LoggerConfig): Logger => {
  cfg = parseEnv({ ...defaultConfig, ...cfg }, 'LOG')
  return Object.entries(cfg).reduce((logger, [chName, channel]) => {
    logger[chName] = buildLogFunc(chName, channel)
    return logger
  }, {})
}

export default createLogger
