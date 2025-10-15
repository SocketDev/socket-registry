import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(__dirname, '../fixtures/debug-simple.mjs')

describe('debug module - subprocess tests', () => {
  describe('isDebug', () => {
    it('should return false when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).toContain('isDebug: false')
    })

    it('should return false when DEBUG is 0', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '0' },
      })
      expect(result).toContain('isDebug: false')
    })

    it('should return false when DEBUG is false', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'false' },
      })
      expect(result).toContain('isDebug: false')
    })

    it('should return true when DEBUG is set to any value', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('isDebug: true')
    })

    it('should return true when DEBUG is set to 1', () => {
      const result = execSync(`node "${fixturePath}" isDebug`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '1' },
      })
      expect(result).toContain('isDebug: true')
    })
  })

  describe('debugLog', () => {
    it('should not log when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugLog`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('test message')
    })

    it('should log when DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugLog`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('test message')
      expect(result).toContain('arg2')
    })
  })

  describe('debugDir', () => {
    it('should not output when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugDir`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('foo')
    })

    it('should output object when DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugDir`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })
  })

  describe('debugNs', () => {
    it('should not log when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugNs`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('message from debugNs')
    })

    it('should log when namespace matches wildcard', () => {
      const result = execSync(`node "${fixturePath}" debugNs`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('test:namespace')
      expect(result).toContain('message from debugNs')
    })

    it('should log when namespace matches exact pattern', () => {
      const result = execSync(`node "${fixturePath}" debugNs`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'test:namespace' },
      })
      expect(result).toContain('message from debugNs')
    })

    it('should log when namespace matches prefix pattern', () => {
      const result = execSync(`node "${fixturePath}" debugNs`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'test:*' },
      })
      expect(result).toContain('message from debugNs')
    })

    it('should not log when namespace is negated', () => {
      const result = execSync(`node "${fixturePath}" debugNs-negation`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*,-test:skip' },
      })
      expect(result).not.toContain('this should not appear')
    })

    it('should handle wildcard patterns without colon', () => {
      const result = execSync(`node "${fixturePath}" debugNs-wildcard`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'app*' },
      })
      expect(result).toContain('wildcard match')
    })
  })

  describe('debuglog', () => {
    it('should not log when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debuglog`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('message from debuglog')
    })

    it('should log with section prefix when DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debuglog`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('[testsection]')
      expect(result).toContain('message from debuglog')
    })
  })

  describe('debugtime', () => {
    it('should not log when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugtime`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('basic timer')
    })

    it('should log timer events when DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugtime`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('[testsection] basic timer')
      expect(result).toContain('[testsection] test-operation: start')
      expect(result).toContain('[testsection] test-operation:')
      expect(result).toMatch(/\d+ms/)
    })
  })
})
