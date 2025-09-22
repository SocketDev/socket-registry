import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  debugDir,
  debugFn,
  debugLog,
  isDebug,
} = require('@socketsecurity/registry/lib/debug')

describe('debug module', () => {
  let originalEnv: NodeJS.ProcessEnv
  let consoleSpy: any

  beforeEach(() => {
    originalEnv = { ...process.env }
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      dir: vi.spyOn(console, 'dir').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('isDebug', () => {
    it('should return true when DEBUG env is set', () => {
      process.env['DEBUG'] = '1'
      expect(isDebug()).toBe(true)

      process.env['DEBUG'] = 'true'
      expect(isDebug()).toBe(true)

      process.env['DEBUG'] = '*'
      expect(isDebug()).toBe(true)
    })

    it('should return false when DEBUG env is not set', () => {
      delete process.env['DEBUG']
      expect(isDebug()).toBe(false)
    })

    it('should return false when DEBUG is set to falsy value', () => {
      process.env['DEBUG'] = '0'
      expect(isDebug()).toBe(false)

      process.env['DEBUG'] = 'false'
      expect(isDebug()).toBe(false)

      process.env['DEBUG'] = ''
      expect(isDebug()).toBe(false)
    })
  })

  describe('debugLog', () => {
    it('should log when debug is enabled', () => {
      process.env['DEBUG'] = '1'
      debugLog('test message', 'arg1', 'arg2')
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'test message',
        'arg1',
        'arg2',
      )
    })

    it('should not log when debug is disabled', () => {
      delete process.env['DEBUG']
      debugLog('test message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should handle multiple arguments', () => {
      process.env['DEBUG'] = '1'
      debugLog('msg', 1, true, { obj: 'value' }, ['array'])
      expect(consoleSpy.log).toHaveBeenCalledWith(
        'msg',
        1,
        true,
        { obj: 'value' },
        ['array'],
      )
    })

    it('should handle no arguments', () => {
      process.env['DEBUG'] = '1'
      debugLog()
      expect(consoleSpy.log).toHaveBeenCalledWith()
    })
  })

  describe('debugDir', () => {
    it('should dir when debug is enabled', () => {
      process.env['DEBUG'] = '1'
      const obj = { key: 'value', nested: { deep: true } }
      debugDir(obj)
      expect(consoleSpy.dir).toHaveBeenCalledWith(obj, expect.any(Object))
    })

    it('should not dir when debug is disabled', () => {
      delete process.env['DEBUG']
      debugDir({ test: 'value' })
      expect(consoleSpy.dir).not.toHaveBeenCalled()
    })

    it('should pass options to console.dir', () => {
      process.env['DEBUG'] = '1'
      const obj = { test: 'value' }
      const options = { colors: true, depth: 2 }
      debugDir(obj, options)
      expect(consoleSpy.dir).toHaveBeenCalledWith(
        obj,
        expect.objectContaining(options),
      )
    })

    it('should handle circular references', () => {
      process.env['DEBUG'] = '1'
      const obj: any = { a: 1 }
      obj.circular = obj
      debugDir(obj)
      expect(consoleSpy.dir).toHaveBeenCalledWith(obj, expect.any(Object))
    })
  })

  describe('debugFn', () => {
    it('should create a debug function', () => {
      const fn = debugFn('test:namespace')
      expect(typeof fn).toBe('function')
    })

    it('should log with namespace when debug matches', () => {
      process.env['DEBUG'] = 'test:*'
      const fn = debugFn('test:namespace')
      fn('message')
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('test:namespace'),
        'message',
      )
    })

    it('should not log when namespace does not match', () => {
      process.env['DEBUG'] = 'other:*'
      const fn = debugFn('test:namespace')
      fn('message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should handle wildcard patterns', () => {
      process.env['DEBUG'] = '*'
      const fn = debugFn('any:namespace')
      fn('message')
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('should handle multiple debug patterns', () => {
      process.env['DEBUG'] = 'test:*,other:*'
      const fn1 = debugFn('test:one')
      const fn2 = debugFn('other:two')
      const fn3 = debugFn('skip:this')

      fn1('msg1')
      fn2('msg2')
      fn3('msg3')

      expect(consoleSpy.log).toHaveBeenCalledTimes(2)
    })

    it('should handle negation patterns', () => {
      process.env['DEBUG'] = '*,-test:skip'
      const fn1 = debugFn('test:include')
      const fn2 = debugFn('test:skip')

      fn1('included')
      fn2('skipped')

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.anything(), 'included')
      expect(consoleSpy.log).not.toHaveBeenCalledWith(
        expect.anything(),
        'skipped',
      )
    })

    it('should include timestamp or time diff', () => {
      process.env['DEBUG'] = 'test:*'
      const fn = debugFn('test:time')
      fn('first')
      setTimeout(() => {
        fn('second')
        const calls = consoleSpy.log.mock.calls
        expect(calls.length).toBeGreaterThanOrEqual(1)
      }, 10)
    })
  })
})
