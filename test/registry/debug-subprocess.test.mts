import type { ExecSyncOptions } from 'node:child_process'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(__dirname, '../fixtures/debug-simple.mjs')

describe('debug module - subprocess tests', () => {
  describe('isDebug', () => {
    it('should return false when SOCKET_DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '' },
      })
      expect(result).toContain('isDebug: false')
    })

    it('should return true when SOCKET_DEBUG is 0 (truthy string)', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '0' },
      })
      expect(result).toContain('isDebug: true')
    })

    it('should return true when SOCKET_DEBUG is false (truthy string)', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: 'false' },
      })
      expect(result).toContain('isDebug: true')
    })

    it('should return true when SOCKET_DEBUG is set to any value', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*' },
      })
      expect(result).toContain('isDebug: true')
    })

    it('should return true when SOCKET_DEBUG is set to 1', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '1' },
      })
      expect(result).toContain('isDebug: true')
    })
  })

  describe('debugLog', () => {
    it('should not log when SOCKET_DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugLog`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '' },
      })
      expect(result).not.toContain('test message')
    })

    it('should log when SOCKET_DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugLog 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('test message')
      expect(result).toContain('arg2')
    })
  })

  describe('debugDir', () => {
    it('should not output when SOCKET_DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugDir`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '' },
      })
      expect(result).not.toContain('foo')
    })

    it('should output object when SOCKET_DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugDir 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })
  })

  describe('debugNs', () => {
    it('should not log when SOCKET_DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugNs`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '' },
      })
      expect(result).not.toContain('message from debugNs')
    })

    it.skip('should log when namespace matches wildcard', () => {
      const result = execSync(`node "${fixturePath}" debugNs 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*', DEBUG: '*' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('message from debugNs')
    })

    it.skip('should log when namespace matches exact pattern', () => {
      const result = execSync(`node "${fixturePath}" debugNs 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*', DEBUG: 'test:namespace' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('message from debugNs')
    })

    it.skip('should log when namespace matches prefix pattern', () => {
      const result = execSync(`node "${fixturePath}" debugNs 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*', DEBUG: 'test:*' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('message from debugNs')
    })

    it('should not log when namespace is negated', () => {
      const result = execSync(`node "${fixturePath}" debugNs-negation`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*', DEBUG: '*,-test:skip' },
      })
      expect(result).not.toContain('this should not appear')
    })

    it.skip('should handle wildcard patterns without colon', () => {
      const result = execSync(`node "${fixturePath}" debugNs-wildcard 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, SOCKET_DEBUG: '*', DEBUG: 'app*' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('wildcard match')
    })
  })

  describe('debuglog', () => {
    it('should not log when NODE_DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debuglog`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_DEBUG: '' },
      })
      expect(result).not.toContain('message from debuglog')
    })

    it('should log with section prefix when NODE_DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debuglog 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_DEBUG: 'testsection' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('TESTSECTION')
      expect(result).toContain('message from debuglog')
    })
  })

  describe('debugtime', () => {
    it('should not log when NODE_DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugtime`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_DEBUG: '' },
      })
      expect(result).not.toContain('basic timer')
    })

    it('should log timer events when NODE_DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugtime 2>&1`, {
        encoding: 'utf8',
        env: { ...process.env, NODE_DEBUG: 'time' },
        shell: true,
      } as unknown as ExecSyncOptions)
      expect(result).toContain('TIME')
      expect(result).toContain('testsection')
      expect(result).toMatch(/\d+ms/)
    })
  })
})
