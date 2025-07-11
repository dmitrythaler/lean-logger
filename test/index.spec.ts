import { describe, it } from "node:test"
import assert from 'assert'

import {
  createLogger,
  type LogLevel,
  type LoggerConfig,
  type Logger,
} from '../src/index.js'

describe('Lean Logger usage suite', () => {

  let intercepted: string[] = [];
  const stdoutBack = process.stdout.write;
  const stderrBack = process.stderr.write;
  const someString = 'no idea what I am doing here...';
  const someNumber = 42;
  const someObject = { ok: true, message: 'I am an object', severity: 3 };
  const messages = [someString, someObject, someNumber];
  const pid = process.pid;
  const mixin = { pid, service: 'AUTH-SERVICE' };
  const mixinMsg = 'Bender was here';
  const mixinFunc = (data: any) => ({ ...data, ...mixin, messages: [...data.messages, mixinMsg] });

  //  ---------------------------------
  /* uncomment to see output */
  const interceptOutput = () => {
    // const stdoutOriginal = process.stdout.write.bind(process.stdout);
    // const stderrOriginal = process.stderr.write.bind(process.stdout);
    process.stdout.write = (chunk, callback): boolean => {
      intercepted.push(chunk as string);
      // return stdoutOriginal(chunk, callback);
      return true;
    };
    process.stderr.write = (chunk, callback): boolean => {
      intercepted.push(chunk as string);
      // return stderrOriginal(chunk, callback);
      return true;
    };
  };

  const releaseOutput = () => {
    process.stdout.write = stdoutBack;
    process.stderr.write = stderrBack;
  };

  const outData = (logger: Logger, channel: string, level: LogLevel, ...data: any[]) => {
    const l = channel === 'default' ? logger : logger.getChannel(channel);
    interceptOutput();
    l[level](...data);
    releaseOutput();
    const out = intercepted.join('');
    intercepted = [];
    if (!out) {
      return undefined;
    }
    const parsed = JSON.parse(out);
    assert.strictEqual(parsed.channel, channel.toUpperCase());
    assert.strictEqual(parsed.level, level.toUpperCase());
    assert.ok(parsed.time);
    const diff = (new Date()).getTime() - (new Date(parsed.time)).getTime();
    assert.ok(diff < 10, `Time difference is too big: ${diff}ms`);
    assert.ok(parsed.messages);
    assert.ok(parsed.messages.length > 0);
    return parsed;
  }

  const assertOutData = (data: any) => {
    assert.ok(data?.messages);
    assert.strictEqual(data.messages[0], someString);
    Object.keys(someObject).forEach(key => {
      assert.strictEqual(data.messages[1][key], someObject[key]);
    });
    assert.strictEqual(data.messages[2], someNumber);
  }

  const assertMixinData = (data: any, testMsg = false) => {
    Object.keys(mixin).forEach(key => {
      assert.strictEqual(data[key], mixin[key]);
    });
    testMsg && assert.strictEqual(data.messages[3], mixinMsg);
  }

  //  ---------------------------------
  //  here we go ...

  const config: LoggerConfig = {
    default: 'info',
    db: 'debug',
    service: 'error',
    test: 'silent'
  }

  const logger = createLogger(config);

  it('should log to default channel', () => {
    let data = outData(logger, 'default', 'info', ...messages);
    assertOutData(data);
    data = outData(logger, 'default', 'warn', ...messages);
    assertOutData(data);
    data = outData(logger, 'default', 'error', ...messages);
    assertOutData(data);
    data = outData(logger, 'default', 'fatal', ...messages);
    assertOutData(data);
  });

  it('shouldn\'t log to default channel below threshold', () => {
    let data = outData(logger, 'default', 'debug', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'default', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'default', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('should log to additional channels', () => {
    let data = outData(logger, 'db', 'debug', ...messages);
    assertOutData(data);
    data = outData(logger, 'db', 'info', ...messages);
    assertOutData(data);
    data = outData(logger, 'db', 'warn', ...messages);
    assertOutData(data);
    data = outData(logger, 'db', 'error', ...messages);
    assertOutData(data);
    data = outData(logger, 'service', 'error', ...messages);
    assertOutData(data);
    data = outData(logger, 'service', 'fatal', ...messages);
    assertOutData(data);
  });

  it('shouldn\'t log to additional channels below threshold', () => {
    let data = outData(logger, 'db', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'db', 'silly', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'service', 'warn', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'service', 'info', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'service', 'debug', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'service', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'service', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('shouldn\'t log to silenced channel', () => {
    let data = outData(logger, 'test', 'fatal', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'test', 'error', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'test', 'warn', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'test', 'info', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'test', 'debug', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'test', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'test', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('shouldn\'t log to non-existent channel', () => {
    let data = outData(logger, 'request', 'fatal', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'request', 'error', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'request', 'warn', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'request', 'info', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'request', 'debug', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'request', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(logger, 'request', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('should be confugured via environment', () => {
    process.env.LOG = 'warn,request:debug';
    const newLogger = createLogger();
    delete process.env.LOG;

    let data = outData(newLogger, 'default', 'info', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'default', 'warn', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'default', 'error', ...messages);
    assertOutData(data);

    data = outData(newLogger, 'request', 'fatal', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'request', 'error', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'request', 'warn', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'request', 'info', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'request', 'debug', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'request', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'request', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('should be reconfugured via environment', () => {
    process.env.LOG = '*:warn,test:info';
    const newLogger = createLogger(config);
    delete process.env.LOG;

    let data = outData(newLogger, 'default', 'info', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'default', 'warn', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'default', 'error', ...messages);
    assertOutData(data);

    data = outData(newLogger, 'test', 'fatal', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'test', 'error', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'test', 'warn', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'test', 'info', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'test', 'debug', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('should handle mis-typed level in environment', () => {
    process.env.LOG = '*: warm, test :all';
    const newLogger = createLogger();
    delete process.env.LOG;

    let data = outData(newLogger, 'default', 'info', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'default', 'warn', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'default', 'error', ...messages);
    assertOutData(data);
    data = outData(newLogger, 'default', 'debug', ...messages);
    assert.strictEqual(data, undefined);

    data = outData(newLogger, 'test', 'fatal', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'error', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'warn', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'info', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'debug', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'trace', ...messages);
    assert.strictEqual(data, undefined);
    data = outData(newLogger, 'test', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('should log mixed-in static data', () => {
    const newLogger = createLogger(config, mixin);
    let data = outData(newLogger, 'default', 'info', ...messages);
    assertOutData(data);
    assertMixinData(data);
    data = outData(newLogger, 'default', 'warn', ...messages);
    assertOutData(data);
    assertMixinData(data);
    data = outData(newLogger, 'default', 'error', ...messages);
    assertOutData(data);
    assertMixinData(data);
    data = outData(newLogger, 'default', 'debug', ...messages);
    assert.strictEqual(data, undefined);
  });

  it('should log mixed-in generated data', () => {
    process.env.LOG = 'request:debug';
    const newLogger = createLogger(config, mixinFunc);
    delete process.env.LOG;

    let data = outData(newLogger, 'request', 'info', ...messages);
    assertOutData(data);
    assertMixinData(data, true);
    data = outData(newLogger, 'request', 'warn', ...messages);
    assertOutData(data);
    assertMixinData(data, true);
    data = outData(newLogger, 'request', 'error', ...messages);
    assertOutData(data);
    assertMixinData(data, true);
    data = outData(newLogger, 'request', 'debug', ...messages);
    assertOutData(data);
    assertMixinData(data, true);
    data = outData(newLogger, 'request', 'silly', ...messages);
    assert.strictEqual(data, undefined);
  });

})
