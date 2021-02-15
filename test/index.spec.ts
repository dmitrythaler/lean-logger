import assert from 'assert'
import fs from 'fs'
import createLogger from '../src/index'
import type * as T from '../src/index'

const opts: T.LoggerConfig = {
  channels: {
    info: { transports: ['stdout'], formatter: 'json' },
    warn: { transports: ['stdout'], formatter: 'json' },
    error: { transports: ['stderr'], formatter: 'json' },
    debug: { transports: ['stdout'], formatter: 'json' }
  }
}

describe('Lean Logger usage suite', () => {
  it('should be able to log to console, JSON', () => {
    const now = Date.now()
    const logger: T.Logger = createLogger(opts)

    const info = logger.info('information') as string
    let data = JSON.parse(info)
    assert.strictEqual(data.channel, 'INFO')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'information')

    const err = logger.error('something wrong', { ok: false }) as string
    data = JSON.parse(err)
    assert.strictEqual(data.channel, 'ERROR')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'something wrong')
    assert.strictEqual(data.messages[1].ok, false)

    const warn = logger.warn('be careful') as string
    data = JSON.parse(warn)
    assert.strictEqual(data.channel, 'WARN')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'be careful')
  })

  it('should be able to log to console', () => {
    const now = (new Date()).toISOString().slice(0, -5)
    Object.values(opts.channels).forEach(channel => channel.formatter = 'console')
    const logger: T.Logger = createLogger(opts)

    const info = logger.info('information') as string
    assert.strictEqual(info.trim(), `${now} INFO: information`)

    const err = logger.error('something wrong', { ok: false }) as string
    assert.strictEqual(err.trim(), `${now} ERROR: something wrong { ok: false }`)

    const warn = logger.warn('be careful') as string
    assert.strictEqual(warn.trim(), `${now} WARN: be careful`)
  })

  it('should include data bound to the channel, JSON', () => {
    const now = Date.now()
    opts.channels.debug.dataBound = { severity: 10 }
    opts.channels.debug.active = true
    opts.channels.debug.formatter = 'json'
    const logger: T.Logger = createLogger(opts)

    const dbg = logger.debug('some debugging info') as string
    let data = JSON.parse(dbg)
    assert.strictEqual(data.channel, 'DEBUG')
    assert.ok(data.time - now < 10)
    assert.strictEqual(data.messages[0], 'some debugging info')
    assert.strictEqual(data.severity, 10)
  })

  it('inactive channels shouldn\'t output', () => {
    Object.values(opts.channels).forEach(channel => channel.active = false)
    const logger: T.Logger = createLogger(opts)

    let empty = logger.info('show me something please')
    assert.strictEqual(empty, undefined)
    empty = logger.error('show me something please')
    assert.strictEqual(empty, undefined)
    empty = logger.warn('show me something please')
    assert.strictEqual(empty, undefined)
  })

  it.skip('should be able to log to file, JSON', () => {
    // const now = Date.now()
    Object.values(opts.channels).forEach(channel => {
      channel.formatter = 'json'
      channel.transports = ['file']
      channel.active = true
      channel.opts = { fileName: './test.out.json' }
    })
    const logger: T.Logger = createLogger(opts)

    logger.info('info to file', process.env)
    logger.warn('warning to file', {data: 'void'})

    const content = fs.readFileSync('./test.out.json', { encoding: 'utf-8' })
    assert.strictEqual(content, 'INFO')
  })

  it('should be configurable via env', () => {
    const now = (new Date()).toISOString().slice(0, -5)
    Object.values(opts.channels).forEach(channel => {
      channel.formatter = 'console'
      channel.active = true
    })
    process.env.LOG = '+error,-info'
    const logger: T.Logger = createLogger(opts)

    const info = logger.info('information') as string
    assert.strictEqual(info, undefined)

    const err = logger.error('something wrong', { ok: false }) as string
    assert.strictEqual(err.trim(), `${now} ERROR: something wrong { ok: false }`)
  })
})
