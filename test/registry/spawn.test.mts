import os from 'node:os'

import { describe, expect, it } from 'vitest'

import {
  isSpawnError,
  isStdioType,
  spawn,
  spawnSync,
} from '../../registry/dist/lib/spawn.js'

describe('spawn module', () => {
  describe('isStdioType', () => {
    it('should identify valid stdio types', () => {
      expect(isStdioType('pipe')).toBe(true)
      expect(isStdioType('ignore')).toBe(true)
      expect(isStdioType('inherit')).toBe(true)
      expect(isStdioType('overlapped')).toBe(true)
    })

    it('should return false for invalid stdio types', () => {
      expect(isStdioType('invalid')).toBe(false)
      expect(isStdioType('')).toBe(false)
      expect(isStdioType(null)).toBe(false)
      expect(isStdioType(undefined)).toBe(false)
      expect(isStdioType(123)).toBe(false)
    })

    it('should be case sensitive', () => {
      expect(isStdioType('PIPE')).toBe(false)
      expect(isStdioType('Inherit')).toBe(false)
    })
  })

  describe('isSpawnError', () => {
    it('should identify spawn errors', () => {
      const error: any = new Error('spawn error')
      error.code = 'ENOENT'
      expect(isSpawnError(error)).toBe(true)
    })

    it('should identify errors with errno', () => {
      const error: any = new Error('spawn error')
      error.errno = -2
      expect(isSpawnError(error)).toBe(true)
    })

    it('should identify errors with syscall', () => {
      const error: any = new Error('spawn error')
      error.syscall = 'spawn'
      expect(isSpawnError(error)).toBe(true)
    })

    it('should return false for regular errors', () => {
      const error = new Error('regular error')
      expect(isSpawnError(error)).toBe(false)
    })

    it('should return false for non-errors', () => {
      expect(isSpawnError('not an error')).toBe(false)
      expect(isSpawnError(null)).toBe(false)
      expect(isSpawnError(undefined)).toBe(false)
      expect(isSpawnError({})).toBe(false)
    })
  })

  describe('spawn', () => {
    it('should execute simple commands', async () => {
      const result = await spawn('echo', ['hello'])
      expect(result).toBeDefined()
      expect(result.stdout).toContain('hello')
    })

    it('should capture exit codes', async () => {
      const result = await spawn('node', ['-e', 'process.exit(0)'])
      expect(result).toBeDefined()
      expect(result.exitCode).toBe(0)
    })

    it('should handle command not found', async () => {
      try {
        await spawn('nonexistentcommand12345', [])
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should support environment variables', async () => {
      const result = await spawn(
        'node',
        ['-e', 'console.log(process.env.TEST_VAR)'],
        {
          env: { ...process.env, TEST_VAR: 'test_value' },
        },
      )
      expect(result.stdout).toContain('test_value')
    })

    it('should support working directory', async () => {
      const tmpDir = os.tmpdir()
      const result = await spawn('node', ['-e', 'console.log(process.cwd())'], {
        cwd: tmpDir,
      })
      expect(result.stdout).toContain(tmpDir)
    })

    it('should support shell option', async () => {
      const result = await spawn('echo hello', [], {
        shell: true,
      })
      expect(result.stdout).toContain('hello')
    })

    it('should handle encoding option', async () => {
      const result = await spawn('echo', ['test'], {
        // @ts-expect-error - Testing runtime behavior with encoding option.
        encoding: 'utf8',
      })
      expect(typeof result.stdout).toBe('string')
    })

    it('should handle timeout', async () => {
      try {
        await spawn('node', ['-e', 'setTimeout(() => {}, 5000)'], {
          timeout: 100,
        })
        expect.fail('Should have timed out')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('spawnSync', () => {
    it('should execute simple commands synchronously', () => {
      const result = spawnSync('echo', ['hello'])
      expect(result).toBeDefined()
      expect(result.stdout).toBeDefined()
      expect(result.stdout.toString()).toContain('hello')
    })

    it('should capture exit codes', () => {
      const result = spawnSync('node', ['-e', 'process.exit(42)'])
      expect(result.status).toBe(42)
    })

    it('should handle command not found', () => {
      const result = spawnSync('nonexistentcommand12345', [])
      expect(result.error).toBeDefined()
    })

    it('should support environment variables', () => {
      const result = spawnSync(
        'node',
        ['-e', 'console.log(process.env.SYNC_VAR)'],
        {
          env: { ...process.env, SYNC_VAR: 'sync_value' },
        },
      )
      expect(result.stdout.toString()).toContain('sync_value')
    })

    it('should support working directory', () => {
      const tmpDir = os.tmpdir()
      const result = spawnSync('node', ['-e', 'console.log(process.cwd())'], {
        cwd: tmpDir,
      })
      expect(result.stdout.toString()).toContain(tmpDir)
    })

    it('should support shell option', () => {
      const result = spawnSync('echo foo', [], {
        shell: true,
      })
      expect(result.stdout.toString()).toContain('foo')
    })

    it('should handle timeout', () => {
      const result = spawnSync('node', ['-e', 'setTimeout(() => {}, 5000)'], {
        timeout: 100,
      })
      expect(result.error).toBeDefined()
    })

    it('should handle encoding option', () => {
      const result = spawnSync('echo', ['test'], {
        // @ts-expect-error - Testing runtime behavior with encoding option.
        encoding: 'utf8',
      })
      expect(typeof result.stdout).toBe('string')
    })

    it('should return pid', () => {
      const result = spawnSync('echo', ['test'])
      if (result.pid) {
        expect(result.pid).toBeGreaterThan(0)
      }
    })
  })
})
