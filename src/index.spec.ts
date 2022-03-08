import assert from 'assert'
import * as L from '../src/index'
import type * as T from '../src/index'

const cfg: T.LoggerConfig = {
  // debug: false,
  // info: true,
  // warn: true,
  // error: true,
  // fatal: true,
  request: true,
  emptiness: true,
  silent: false
}

const testChannel = (logger: T.Logger, ch: string) => {
  const out = logger[ch]('information', { ok: false }) as string
  assert.ok(out)
  const data = JSON.parse(out)
  assert.strictEqual(data.channel, ch.toUpperCase())
  assert.ok(Date.now() - data.time < 10)
  assert.strictEqual(data.messages[0], 'information')
  assert.strictEqual(data.messages[1].ok, false)
  return data
}

const testDeadChannel = (logger: T.Logger, ch: string) => {
  const out = logger[ch]('information', { ok: false }) as string
  assert.strictEqual(out, undefined)
}

describe('Lean Logger usage suite', () => {

  it('should log to default channels', () => {
    const logger: T.Logger = L.createLogger(cfg)
    testChannel(logger, 'info')
    testChannel(logger, 'error')
    testChannel(logger, 'warn')
  })

  it('should log to added channels', () => {
    const logger: T.Logger = L.createLogger(cfg)
    testChannel(logger, 'request')
    testChannel(logger, 'emptiness')
  })

  it('shouldn\'t log to inactive channels', () => {
    const logger: T.Logger = L.createLogger(cfg)
    testDeadChannel(logger, 'silent')
    testDeadChannel(logger, 'debug')
  })

  it('shouldn\'t log to non-existent channels and shouldn\'t throw', () => {
    const logger: T.Logger = L.createLogger(cfg)
    testDeadChannel(logger, 'noSuchChannel')
    testDeadChannel(logger, '***12345')
  })

  it('should be configurable via ENV', () => {
    process.env.LOG = 'test,service'
    let logger: T.Logger = L.createLogger()
    testChannel(logger, 'service')
    testChannel(logger, 'test')
    testChannel(logger, 'info')
    testChannel(logger, 'warn')
    testChannel(logger, 'error')
    testChannel(logger, 'fatal')
    testDeadChannel(logger, 'request')
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
    testDeadChannel(logger, 'debug')
    testDeadChannel(logger, 'info')
    testChannel(logger, 'warn')
    testChannel(logger, 'request')
  })

  it('should be configurable via ENV, min severity level', () => {
    process.env.LOG = 'warn+'
    let logger: T.Logger = L.createLogger(cfg)
    testDeadChannel(logger, 'info')
    testDeadChannel(logger, 'request')
    testChannel(logger, 'warn')
    testChannel(logger, 'error')
    testChannel(logger, 'fatal')
  })

  it('should extract channel and log to', () => {
    process.env.LOG = 'test'
    let logger: T.Logger = L.createLogger(cfg)
    let channel: T.LoggerFunc = logger.channel('test')
    const now = Date.now()

    let info = channel('some information', { msg: 'hi there' }) as string
    const data = JSON.parse(info)
    assert.strictEqual(data.channel, 'TEST')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some information')
    assert.strictEqual(data.messages[1].msg, 'hi there')

    process.env.LOG = 'something-else'
    logger = L.createLogger(cfg)
    channel = logger.channel('test')
    info = channel('some information', { msg: 'hi there' }) as string
    assert.strictEqual(info, undefined)
  })

  it('should extract wild channels and log to', () => {
    process.env.LOG = 'module:*'
    let logger: T.Logger = L.createLogger(cfg)
    const channel1: T.LoggerFunc = logger.channel('module:db')
    const channel2: T.LoggerFunc = logger.channel('module:auth')
    const channel3: T.LoggerFunc = logger.channel('module/err')
    const channel4: T.LoggerFunc = logger.channel('module')
    const now = Date.now()

    let info = channel1('some information', { msg: 'hi there' }) as string
    assert.ok(info)
    let data = JSON.parse(info)
    assert.strictEqual(data.channel, 'MODULE:DB')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some information')
    assert.strictEqual(data.messages[1].msg, 'hi there')

    info = channel2('some other information', { msg: 'nothing new' }) as string
    assert.ok(info)
    data = JSON.parse(info)
    assert.strictEqual(data.channel, 'MODULE:AUTH')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some other information')
    assert.strictEqual(data.messages[1].msg, 'nothing new')

    info = channel3('some useless information', { msg: 'void' }) as string
    assert.strictEqual(info, undefined)
    info = channel4('some useless information', { msg: 'void' }) as string
    assert.strictEqual(info, undefined)
  })

  it('should extend channels and log with object mixin', () => {
    const logger: T.Logger = L.createLogger(cfg, {
      channels: '*',
      mixin: { service: 'TEST-RIG' }
    })
    let data = testChannel(logger, 'info')
    assert.strictEqual(data.service,'TEST-RIG')
    data = testChannel(logger, 'error')
    assert.strictEqual(data.service,'TEST-RIG')
    data = testChannel(logger, 'warn')
    assert.strictEqual(data.service,'TEST-RIG')
  })

  it('should extend channels and log with function mixin', () => {
    const logger: T.Logger = L.createLogger(cfg, {
      channels: ['all'],
      mixin: data => { data.pid = process.pid; return data }
    })
    const pid = process.pid
    let data = testChannel(logger, 'info')
    assert.strictEqual(data.pid,pid)
    data = testChannel(logger, 'error')
    assert.strictEqual(data.pid,pid)
    data = testChannel(logger, 'warn')
    assert.strictEqual(data.pid,pid)
  })

  it('should extend only selected channels and log with mixin', () => {
    const logger: T.Logger = L.createLogger(cfg, {
      channels: ['error', 'warn'],
      mixin: { service: 'TEST-RIG' }
    })
    let data = testChannel(logger, 'info')
    assert.strictEqual(data.service, undefined)
    data = testChannel(logger, 'error')
    assert.strictEqual(data.service, 'TEST-RIG')
    data = testChannel(logger, 'warn')
    assert.strictEqual(data.service, 'TEST-RIG')
  })
})
