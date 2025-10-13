import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  debugDir,
  debugDirNs,
  debugLog,
  debugLogNs,
  debugNs,
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

  describe('isDebugNs', () => {
    it('should return false when SOCKET_DEBUG is not set', () => {
      delete process.env['SOCKET_DEBUG']
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

  describe('debugNs', () => {
    it('should not log when namespace does not match', () => {
      process.env['DEBUG'] = 'other:*'
      debugNs('test:namespace', 'message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })
})
