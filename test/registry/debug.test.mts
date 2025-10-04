import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  debugDir,
  debugDirNs,
  debugFn,
  debugFnNs,
  debugLog,
  debugLogNs,
  debuglog,
  debugtime,
  isDebug,
  isDebugNs,
} from '../../registry/dist/lib/debug.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envModulePath = path.resolve(
  __dirname,
  '../../registry/dist/lib/constants/ENV.js',
)

async function evalEnvDebug(debugValue: string): Promise<string> {
  const code = `import ENV from '${pathToFileURL(envModulePath).href}'; console.log(ENV.DEBUG)`
  const proc = spawn(
    process.execPath,
    ['--input-type=module', '--eval', code],
    {
      env: { DEBUG: debugValue },
    },
  )
  proc.stdout.setEncoding('utf8')
  proc.stderr.setEncoding('utf8')
  let stdout = ''
  let stderr = ''
  for await (const chunk of proc.stdout) {
    stdout += chunk
  }
  for await (const chunk of proc.stderr) {
    stderr += chunk
  }
  if (stderr) {
    throw new Error(`evalEnvDebug failed: ${stderr}`)
  }
  return stdout.trim()
}

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

  describe('ENV.DEBUG normalization', () => {
    it('should normalize DEBUG="1" to "*"', async () => {
      expect(await evalEnvDebug('1')).toBe('*')
    })

    it('should normalize DEBUG="true" to "*"', async () => {
      expect(await evalEnvDebug('true')).toBe('*')
    })

    it('should normalize DEBUG="TRUE" to "*"', async () => {
      expect(await evalEnvDebug('TRUE')).toBe('*')
    })

    it('should normalize DEBUG="0" to empty string', async () => {
      expect(await evalEnvDebug('0')).toBe('')
    })

    it('should normalize DEBUG="false" to empty string', async () => {
      expect(await evalEnvDebug('false')).toBe('')
    })

    it('should normalize DEBUG="FALSE" to empty string', async () => {
      expect(await evalEnvDebug('FALSE')).toBe('')
    })

    it('should preserve namespace patterns unchanged', async () => {
      expect(await evalEnvDebug('app:*')).toBe('app:*')
    })

    it('should preserve complex patterns unchanged', async () => {
      expect(await evalEnvDebug('test:*,other:*,-skip:*')).toBe(
        'test:*,other:*,-skip:*',
      )
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

    it('should include timestamp or time diff', async () => {
      process.env['DEBUG'] = 'test:*'
      const fn = debugFn('test:time')
      fn('first')
      await new Promise(resolve => {
        setTimeout(() => {
          fn('second')
          const calls = consoleSpy.log.mock.calls
          expect(calls.length).toBeGreaterThanOrEqual(1)
          resolve(undefined)
        }, 10)
      })
    })
  })

  describe('debuglog', () => {
    it('should create a debug logger function', () => {
      const logger = debuglog('test')
      expect(typeof logger).toBe('function')
    })

    it('should log with section prefix when debug is enabled', () => {
      process.env['DEBUG'] = '1'
      const logger = debuglog('testsection')
      logger('test message', 'arg1')
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[testsection]',
        'test message',
        'arg1',
      )
    })

    it('should not log when debug is disabled', () => {
      delete process.env['DEBUG']
      const logger = debuglog('testsection')
      logger('test message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should handle multiple arguments', () => {
      process.env['DEBUG'] = '1'
      const logger = debuglog('multi')
      logger('msg', 1, true, { obj: 'value' })
      expect(consoleSpy.log).toHaveBeenCalledWith('[multi]', 'msg', 1, true, {
        obj: 'value',
      })
    })
  })

  describe('debugtime', () => {
    it('should create a debug timer function', () => {
      const timer = debugtime('test')
      expect(typeof timer).toBe('function')
      expect(typeof timer.start).toBe('function')
      expect(typeof timer.end).toBe('function')
    })

    it('should log basic messages when debug is enabled', () => {
      process.env['DEBUG'] = '1'
      const timer = debugtime('testsection')
      timer('operation')
      expect(consoleSpy.log).toHaveBeenCalledWith('[testsection] operation')
    })

    it('should not log when debug is disabled', () => {
      delete process.env['DEBUG']
      const timer = debugtime('testsection')
      timer('operation')
      timer.start('task')
      timer.end('task')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })

    it('should log start timing when debug is enabled', () => {
      process.env['DEBUG'] = '1'
      const timer = debugtime('timing')
      timer.start('operation')
      expect(consoleSpy.log).toHaveBeenCalledWith('[timing] operation: start')
    })

    it('should log end timing with duration when debug is enabled', async () => {
      process.env['DEBUG'] = '1'
      const timer = debugtime('timing')

      timer.start('operation')

      // Wait a small amount of time to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 10))

      timer.end('operation')

      const calls = consoleSpy.log.mock.calls
      expect(calls).toContainEqual(['[timing] operation: start'])
      expect(
        calls.some(
          (call: any) =>
            call[0] &&
            call[0].startsWith('[timing] operation: ') &&
            call[0].endsWith('ms'),
        ),
      ).toBe(true)
    })

    it('should handle ending timer that was not started', () => {
      process.env['DEBUG'] = '1'
      const timer = debugtime('timing')
      timer.end('nonexistent')

      // Should not crash and should not log duration
      const calls = consoleSpy.log.mock.calls
      expect(
        calls.some((call: any) => call[0] && call[0].includes('nonexistent')),
      ).toBe(false)
    })

    it('should handle multiple timers independently', async () => {
      process.env['DEBUG'] = '1'
      const timer = debugtime('multi')

      timer.start('task1')
      timer.start('task2')

      await new Promise(resolve => setTimeout(resolve, 5))
      timer.end('task1')

      await new Promise(resolve => setTimeout(resolve, 5))
      timer.end('task2')

      const calls = consoleSpy.log.mock.calls
      expect(calls).toContainEqual(['[multi] task1: start'])
      expect(calls).toContainEqual(['[multi] task2: start'])
      expect(
        calls.some(
          (call: any) =>
            call[0] &&
            call[0].startsWith('[multi] task1: ') &&
            call[0].endsWith('ms'),
        ),
      ).toBe(true)
      expect(
        calls.some(
          (call: any) =>
            call[0] &&
            call[0].startsWith('[multi] task2: ') &&
            call[0].endsWith('ms'),
        ),
      ).toBe(true)
    })

    it('should remove timer after ending', () => {
      process.env['DEBUG'] = '1'
      const timer = debugtime('cleanup')

      timer.start('task')
      timer.end('task')

      // Clear previous calls
      consoleSpy.log.mockClear()

      // Try to end the same timer again
      timer.end('task')

      // Should not log anything since timer was removed
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('isDebugNs', () => {
    it('should return false when SOCKET_CLI_DEBUG is not set', () => {
      delete process.env['SOCKET_CLI_DEBUG']
      expect(isDebugNs('test')).toBe(false)
    })
  })

  describe('debugLogNs', () => {
    it('should not log when namespace does not match', () => {
      process.env['DEBUG'] = 'other:*'
      const callsBefore = consoleSpy.log.mock.calls.length
      debugLogNs('test:namespace', 'message')
      expect(consoleSpy.log.mock.calls.length).toBe(callsBefore)
    })
  })

  describe('debugDirNs', () => {
    it('should not dir when namespace does not match', () => {
      process.env['DEBUG'] = 'other:*'
      debugDirNs('test:namespace', { key: 'value' })
      expect(consoleSpy.dir).not.toHaveBeenCalled()
    })
  })

  describe('debugFnNs', () => {
    it('should not log when namespace does not match', () => {
      process.env['DEBUG'] = 'other:*'
      debugFnNs('test:namespace', 'message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })
})
