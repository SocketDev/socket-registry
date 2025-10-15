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

const debugModulePath = path.resolve(
  __dirname,
  '../../registry/dist/lib/debug.js',
)

async function evalIsDebug(debugValue: string | undefined): Promise<boolean> {
  const env: Record<string, string> = {}
  if (debugValue !== undefined) {
    env.DEBUG = debugValue
  }
  const code = `import { isDebug } from '${pathToFileURL(debugModulePath).href}'; console.log(isDebug())`
  const proc = spawn(
    process.execPath,
    ['--input-type=module', '--eval', code],
    { env },
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
    throw new Error(`evalIsDebug failed: ${stderr}`)
  }
  return stdout.trim() === 'true'
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
    it('should return true when DEBUG env is set', async () => {
      expect(await evalIsDebug('1')).toBe(true)
      expect(await evalIsDebug('true')).toBe(true)
      expect(await evalIsDebug('*')).toBe(true)
    })

    it('should return false when DEBUG env is not set', async () => {
      expect(await evalIsDebug(undefined)).toBe(false)
    })

    it('should return false when DEBUG is set to falsy value', async () => {
      expect(await evalIsDebug('0')).toBe(false)
      expect(await evalIsDebug('false')).toBe(false)
      expect(await evalIsDebug('')).toBe(false)
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
    it('should not throw when called', () => {
      // debugLog checks ENV.SOCKET_DEBUG which is set at module load time
      // We just verify it doesn't throw regardless of current env
      expect(() => debugLog('test message', 'arg1', 'arg2')).not.toThrow()
    })

    it('should not throw when debug is disabled', () => {
      expect(() => debugLog('test message')).not.toThrow()
    })

    it('should handle multiple arguments without throwing', () => {
      expect(() =>
        debugLog('msg', 1, true, { obj: 'value' }, ['array']),
      ).not.toThrow()
    })

    it('should handle no arguments without throwing', () => {
      expect(() => debugLog()).not.toThrow()
    })
  })

  describe('debugDir', () => {
    it('should not throw when debug is called', () => {
      // debugDir checks ENV.SOCKET_DEBUG which is set at module load time
      // We just verify it doesn't throw regardless of current env
      const obj = { key: 'value', nested: { deep: true } }
      expect(() => debugDir(obj)).not.toThrow()
    })

    it('should not throw when debug is disabled', () => {
      expect(() => debugDir({ test: 'value' })).not.toThrow()
    })

    it('should not throw when passing options', () => {
      const obj = { test: 'value' }
      const options = { colors: true, depth: 2 }
      expect(() => debugDir(obj, options)).not.toThrow()
    })

    it('should handle circular references without throwing', () => {
      const obj: any = { a: 1 }
      obj.circular = obj
      expect(() => debugDir(obj)).not.toThrow()
    })
  })

  describe('isDebugNs', () => {
    it('should return false when SOCKET_DEBUG is not set', () => {
      delete process.env.SOCKET_DEBUG
      expect(isDebugNs('test')).toBe(false)
    })
  })

  describe('debugLogNs', () => {
    it('should not log when namespace does not match', () => {
      process.env.DEBUG = 'other:*'
      const callsBefore = consoleSpy.log.mock.calls.length
      debugLogNs('test:namespace', 'message')
      expect(consoleSpy.log.mock.calls.length).toBe(callsBefore)
    })
  })

  describe('debugDirNs', () => {
    it('should not dir when namespace does not match', () => {
      process.env.DEBUG = 'other:*'
      debugDirNs('test:namespace', { key: 'value' })
      expect(consoleSpy.dir).not.toHaveBeenCalled()
    })
  })

  describe('debugNs', () => {
    it('should not log when namespace does not match', () => {
      process.env.DEBUG = 'other:*'
      debugNs('test:namespace', 'message')
      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })
})
