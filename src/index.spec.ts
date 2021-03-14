import assert from 'assert'
import * as L from '../src/index'
import type * as T from '../src/index'

const cfg: T.LoggerConfig = {
  // info: { active: true, severity: L.LEVELS.info },
  // warn: { active: true, severity: L.LEVELS.warn },
  // error: { active: true, severity: L.LEVELS.error },
  // fatal: { active: true, severity: L.LEVELS.fatal },
  request: { severity: L.LEVELS.info },
  emptiness: {/*defaults - active: true, severity: L.LEVELS.debug */}
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
  it('shoold be deeply configurable', () => {
    const cfg = L.mergeWithDefaultConfig({
      fatal: { active: false, severity: 666 },
      dummy: {},
      void: undefined
    })
    assert.strictEqual(cfg.fatal.severity, 666)
    assert.strictEqual(cfg.fatal.active, false)
    assert.strictEqual(cfg.error.severity, L.LEVELS.error)
    assert.strictEqual(cfg.error.active, true)
    assert.strictEqual(cfg.dummy.severity, L.LEVELS.debug)
    assert.strictEqual(cfg.dummy.active, true)
    assert.strictEqual(cfg.void.severity, L.LEVELS.debug)
    assert.strictEqual(cfg.void.active, true)
  })

  it('should be able to log to default channels', () => {
    const logger: T.Logger = L.createLogger(cfg)
    testChannel(logger, 'info')
    testChannel(logger, 'error')
    testChannel(logger, 'warn')
  })

  it('should be able to log to added channels', () => {
    const logger: T.Logger = L.createLogger(cfg)
    testChannel(logger, 'request')
    testChannel(logger, 'emptiness')
  })

  it('shouldn\'t output inactive channels', () => {
    Object.values(L.mergeWithDefaultConfig(cfg))
      .forEach(channel => channel.active = false)
    const logger: T.Logger = L.createLogger(cfg)
    testDeadChannel(logger, 'info')
    testDeadChannel(logger, 'error')
    testDeadChannel(logger, 'warn')
  })

  it('should be configurable via ENV, explicitly activate', () => {
    process.env.LOG = '-all,request,+fatal'
    let logger: T.Logger = L.createLogger(cfg)
    testChannel(logger, 'request')
    testChannel(logger, 'fatal')
    testDeadChannel(logger, 'info')
    testDeadChannel(logger, 'warn')
  })

  it('should be configurable via ENV, explicitly deactivate', () => {
    process.env.LOG = 'all,-info'
    let logger: T.Logger = L.createLogger(cfg)
    testDeadChannel(logger, 'info')
    testChannel(logger, 'warn')
    testChannel(logger, 'request')
  })

  it('should be configurable via ENV, min level', () => {
    process.env.LOG = 'warn+'
    let logger: T.Logger = L.createLogger(cfg)
    testDeadChannel(logger, 'info')
    testDeadChannel(logger, 'request')
    testChannel(logger, 'warn')
    testChannel(logger, 'error')
    testChannel(logger, 'fatal')
  })

  it('should be able to debug log', () => {
    process.env.DEBUG = 'test'
    let debug: T.LoggerFunc = L.createDebugLogger('test')
    const now = Date.now()

    let info = debug('some information', { msg: 'hi there' }) as string
    const data = JSON.parse(info)
    assert.strictEqual(data.channel, 'TEST')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some information')
    assert.strictEqual(data.messages[1].msg, 'hi there')

    process.env.DEBUG = 'something-else'
    debug = L.createDebugLogger('test')
    info = debug('some information', { msg: 'hi there' }) as string
    assert.strictEqual(info, undefined)
  })

  it('should be able to parse env with wild symbol', () => {
    process.env.DEBUG = 'module:*'
    let debug1: T.LoggerFunc = L.createDebugLogger('module:db')
    let debug2: T.LoggerFunc = L.createDebugLogger('module:auth')
    let debug3: T.LoggerFunc = L.createDebugLogger('module/err')
    const now = Date.now()

    let info = debug1('some information', { msg: 'hi there' }) as string
    let data = JSON.parse(info)
    assert.strictEqual(data.channel, 'MODULE:DB')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some information')
    assert.strictEqual(data.messages[1].msg, 'hi there')

    info = debug2('some other information', { msg: 'nothing new' }) as string
    data = JSON.parse(info)
    assert.strictEqual(data.channel, 'MODULE:AUTH')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some other information')
    assert.strictEqual(data.messages[1].msg, 'nothing new')

    info = debug3('some useless information', { msg: 'void' }) as string
    assert.strictEqual(info, undefined)
  })
})
