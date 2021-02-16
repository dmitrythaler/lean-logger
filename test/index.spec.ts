import assert from 'assert'
import createLogger, { createDebugLogger, mergeWithDefaultConfig, LEVELS } from '../src/index'
import type * as T from '../src/index'

const cfg: T.LoggerConfig = {
  // info: { active: true, severity: LEVELS.info },
  // warn: { active: true, severity: LEVELS.warn },
  // error: { active: true, severity: LEVELS.error },
  // fatal: { active: true, severity: LEVELS.fatal },
  request: { severity: LEVELS.info }
}

const testChannel = (logger: T.Logger, ch: string) => {
  const out = logger[ch]('information', { ok: false }) as string
  const data = JSON.parse(out)
  assert.strictEqual(data.channel, ch.toUpperCase())
  assert.ok(Date.now() - data.time < 10)
  assert.strictEqual(data.messages[0], 'information')
  assert.strictEqual(data.messages[1].ok, false)
}

const testDeadChannel = (logger: T.Logger, ch: string) => {
  const out = logger[ch]('information', { ok: false }) as string
  assert.strictEqual(out, undefined)
}

describe('Lean Logger usage suite', () => {
  it('should be able to log to default channels', () => {
    const logger: T.Logger = createLogger(cfg)
    testChannel(logger, 'info')
    testChannel(logger, 'error')
    testChannel(logger, 'warn')
  })

  it('should be able to log to added channel', () => {
    const logger: T.Logger = createLogger(cfg)
    testChannel(logger, 'request')
  })

  it('inactive channels shouldn\'t output', () => {
    Object.values(mergeWithDefaultConfig(cfg))
      .forEach(channel => channel.active = false)
    const logger: T.Logger = createLogger(cfg)
    testDeadChannel(logger, 'info')
    testDeadChannel(logger, 'error')
    testDeadChannel(logger, 'warn')
  })

  it('should be configurable via ENV, explicitly activate', () => {
    process.env.LOG = '-all,request,+fatal'
    let logger: T.Logger = createLogger(cfg)
    testChannel(logger, 'request')
    testChannel(logger, 'fatal')
    testDeadChannel(logger, 'info')
    testDeadChannel(logger, 'warn')
  })

  it('should be configurable via ENV, explicitly deactivate', () => {
    process.env.LOG = 'all,-info'
    let logger: T.Logger = createLogger(cfg)
    testDeadChannel(logger, 'info')
    testChannel(logger, 'warn')
    testChannel(logger, 'request')
  })

  it('should be configurable via ENV, min level', () => {
    process.env.LOG = 'warn+'
    let logger: T.Logger = createLogger(cfg)
    testDeadChannel(logger, 'info')
    testDeadChannel(logger, 'request')
    testChannel(logger, 'warn')
    testChannel(logger, 'error')
    testChannel(logger, 'fatal')
  })

  it('should be able to debug log', () => {
    process.env.DEBUG = 'test'
    let debug: T.LoggerFunc = createDebugLogger('test')
    const now = Date.now()

    let info = debug('some information', { msg: 'hi there' }) as string
    const data = JSON.parse(info)
    assert.strictEqual(data.channel, 'TEST')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some information')
    assert.strictEqual(data.messages[1].msg, 'hi there')

    process.env.DEBUG = 'something-else'
    debug = createDebugLogger('test')
    info = debug('some information', { msg: 'hi there' }) as string
    assert.strictEqual(info, undefined)
  })
})
