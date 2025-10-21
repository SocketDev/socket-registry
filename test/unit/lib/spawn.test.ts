/**
 * @fileoverview Tests for spawn utilities.
 *
 * Validates spawn utility functions, type guards, and basic spawn operations.
 */

import {
  isSpawnError,
  isStdioType,
  spawn,
  spawnSync,
} from '@socketsecurity/lib/spawn'
import { describe, expect, it } from 'vitest'

describe('spawn utilities', () => {
  describe('isSpawnError', () => {
    it('should return true for objects with code property', () => {
      const error = { code: 'ENOENT' }
      expect(isSpawnError(error)).toBe(true)
    })

    it('should return true for objects with errno property', () => {
      const error = { errno: -2 }
      expect(isSpawnError(error)).toBe(true)
    })

    it('should return true for objects with syscall property', () => {
      const error = { syscall: 'spawn' }
      expect(isSpawnError(error)).toBe(true)
    })

    it('should return true for Error objects with spawn properties', () => {
      const error = new Error('spawn error')
      Object.assign(error, { code: 'ENOENT', errno: -2 })
      expect(isSpawnError(error)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isSpawnError(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isSpawnError(undefined)).toBe(false)
    })

    it('should return false for primitive types', () => {
      expect(isSpawnError('string')).toBe(false)
      expect(isSpawnError(123)).toBe(false)
      expect(isSpawnError(true)).toBe(false)
    })

    it('should return false for empty objects', () => {
      expect(isSpawnError({})).toBe(false)
    })

    it('should return false for objects without spawn properties', () => {
      const error = { message: 'error', name: 'Error' }
      expect(isSpawnError(error)).toBe(false)
    })

    it('should return true for objects with multiple spawn properties', () => {
      const error = { code: 'ENOENT', errno: -2, syscall: 'spawn' }
      expect(isSpawnError(error)).toBe(true)
    })

    it('should return false for objects with code undefined', () => {
      const error = { code: undefined, errno: undefined }
      expect(isSpawnError(error)).toBe(false)
    })
  })

  describe('isStdioType', () => {
    describe('single argument validation', () => {
      it('should return true for valid stdio types', () => {
        expect(isStdioType('pipe')).toBe(true)
        expect(isStdioType('ignore')).toBe(true)
        expect(isStdioType('inherit')).toBe(true)
        expect(isStdioType('overlapped')).toBe(true)
      })

      it('should return false for invalid stdio types', () => {
        expect(isStdioType('invalid')).toBe(false)
        expect(isStdioType('ipc')).toBe(false)
        expect(isStdioType('')).toBe(false)
      })

      it('should return false for array input with single argument', () => {
        expect(isStdioType(['pipe', 'pipe', 'pipe'] as any)).toBe(false)
      })
    })

    describe('two argument comparison', () => {
      it('should return true when stdio matches type', () => {
        expect(isStdioType('pipe', 'pipe')).toBe(true)
        expect(isStdioType('ignore', 'ignore')).toBe(true)
        expect(isStdioType('inherit', 'inherit')).toBe(true)
      })

      it('should return false when stdio does not match type', () => {
        expect(isStdioType('pipe', 'ignore')).toBe(false)
        expect(isStdioType('inherit', 'pipe')).toBe(false)
      })

      it('should handle array stdio configuration', () => {
        expect(isStdioType(['pipe', 'pipe', 'pipe'], 'pipe')).toBe(true)
        expect(isStdioType(['ignore', 'ignore', 'ignore'], 'ignore')).toBe(true)
      })

      it('should return false for mismatched array stdio', () => {
        expect(isStdioType(['pipe', 'ignore', 'pipe'], 'pipe')).toBe(false)
        expect(isStdioType(['pipe', 'pipe'], 'pipe')).toBe(false)
      })

      it('should handle null and undefined as pipe', () => {
        expect(isStdioType(null as any, 'pipe')).toBe(true)
        expect(isStdioType(undefined as any, 'pipe')).toBe(true)
      })

      it('should return false for null/undefined with non-pipe type', () => {
        expect(isStdioType(null as any, 'ignore')).toBe(false)
        expect(isStdioType(undefined as any, 'inherit')).toBe(false)
      })
    })

    describe('edge cases', () => {
      it('should handle empty array', () => {
        expect(isStdioType([], 'pipe')).toBe(false)
      })

      it('should require at least 3 elements for array match', () => {
        expect(isStdioType(['pipe'], 'pipe')).toBe(false)
        expect(isStdioType(['pipe', 'pipe'], 'pipe')).toBe(false)
      })

      it('should handle array with more than 3 elements', () => {
        expect(isStdioType(['pipe', 'pipe', 'pipe', 'pipe'], 'pipe')).toBe(true)
      })
    })
  })

  describe('spawn', () => {
    it('should be a function', () => {
      expect(typeof spawn).toBe('function')
    })

    it('should spawn a simple command', async () => {
      const result = await spawn('echo', ['test'])
      expect(result).toBeDefined()
      expect(result.code).toBe(0)
    })

    it('should capture stdout', async () => {
      const result = await spawn('echo', ['hello'])
      expect(result.stdout).toBeDefined()
      expect(result.stdout.toString()).toContain('hello')
    })

    it('should handle command with no arguments', async () => {
      const result = await spawn('echo', [])
      expect(result.code).toBe(0)
    })

    it('should handle command errors', async () => {
      try {
        await spawn('nonexistentcommand12345', [])
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle cwd option', async () => {
      const result = await spawn('pwd', [], { cwd: '/tmp' })
      expect(result.code).toBe(0)
    })

    it('should handle env option', async () => {
      const result = await spawn('echo', ['$TEST_VAR'], {
        env: { TEST_VAR: 'value' },
        shell: true,
      })
      expect(result.code).toBe(0)
    })

    it('should return result with stdout and stderr', async () => {
      const result = await spawn('echo', ['test'])
      expect(result).toHaveProperty('stdout')
      expect(result).toHaveProperty('stderr')
      expect(result).toHaveProperty('code')
    })

    it('should handle shell option', async () => {
      const result = await spawn('echo test', [], { shell: true })
      expect(result.code).toBe(0)
    })
  })

  describe('spawnSync', () => {
    it('should be a function', () => {
      expect(typeof spawnSync).toBe('function')
    })

    it('should spawn a simple command synchronously', () => {
      const result = spawnSync('echo', ['test'])
      expect(result).toBeDefined()
      expect(result.status).toBe(0)
    })

    it('should capture stdout synchronously', () => {
      const result = spawnSync('echo', ['hello'])
      expect(result.stdout).toBeDefined()
      expect(result.stdout.toString()).toContain('hello')
    })

    it('should handle command with no arguments', () => {
      const result = spawnSync('echo', [])
      expect(result.status).toBe(0)
    })

    it('should handle command errors synchronously', () => {
      const result = spawnSync('nonexistentcommand12345', [])
      expect(result.error).toBeDefined()
    })

    it('should handle cwd option synchronously', () => {
      const result = spawnSync('pwd', [], { cwd: '/tmp' })
      expect(result.status).toBe(0)
    })

    it('should return result with stdout and stderr', () => {
      const result = spawnSync('echo', ['test'])
      expect(result).toHaveProperty('stdout')
      expect(result).toHaveProperty('stderr')
      expect(result).toHaveProperty('status')
    })

    it('should handle shell option synchronously', () => {
      const result = spawnSync('echo test', [], { shell: true })
      expect(result.status).toBe(0)
    })

    it('should handle timeout option', () => {
      const result = spawnSync('sleep', ['0.1'], { timeout: 1000 })
      expect(result).toBeDefined()
    })
  })

  describe('integration tests', () => {
    it('should handle piped commands', async () => {
      const result = await spawn('echo', ['test'], {
        stdio: ['pipe', 'pipe', 'pipe'] as any,
      })
      expect(result.code).toBe(0)
    })

    it('should handle inherited stdio', async () => {
      const result = await spawn('echo', ['test'], {
        stdio: 'inherit' as any,
      })
      expect(result.code).toBe(0)
    })

    it('should work with both spawn and spawnSync for same command', async () => {
      const asyncResult = await spawn('echo', ['test'])
      const syncResult = spawnSync('echo', ['test'])

      expect(asyncResult.code).toBe(0)
      expect(syncResult.status).toBe(0)
      expect(asyncResult.stdout.toString()).toContain('test')
      expect(syncResult.stdout.toString()).toContain('test')
    })
  })

  describe('edge cases', () => {
    it('should handle empty command arguments', async () => {
      const result = await spawn('echo', [])
      expect(result.code).toBe(0)
    })

    it('should handle commands with special characters', async () => {
      const result = await spawn('echo', ['hello world'])
      expect(result.stdout.toString()).toContain('hello world')
    })

    it('should handle multiple arguments', async () => {
      const result = await spawn('echo', ['arg1', 'arg2', 'arg3'])
      expect(result.code).toBe(0)
    })

    it('should handle very long output', async () => {
      const result = await spawn('echo', ['-n', 'a'.repeat(1000)])
      expect(result.code).toBe(0)
      expect(result.stdout.toString().length).toBeGreaterThan(500)
    })

    it('should handle commands that write to stderr', async () => {
      const result = await spawn('node', ['-e', 'console.error("error")'])
      expect(result.stderr).toBeDefined()
    })

    it('should handle process that exits with non-zero', async () => {
      try {
        await spawn('node', ['-e', 'process.exit(1)'])
        expect.fail('Should have thrown or returned error code')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
})
