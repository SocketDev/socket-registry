import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturePath = path.join(__dirname, '../fixtures/debug-simple.mjs')

describe('debug module - subprocess tests', () => {
  describe('isDebugSimple', () => {
    it('should return false when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" isDebugSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).toContain('isDebugSimple: false')
    })

    it('should return false when DEBUG is 0', () => {
      const result = execSync(`node "${fixturePath}" isDebugSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '0' },
      })
      expect(result).toContain('isDebugSimple: false')
    })

    it('should return false when DEBUG is false', () => {
      const result = execSync(`node "${fixturePath}" isDebugSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'false' },
      })
      expect(result).toContain('isDebugSimple: false')
    })

    it('should return true when DEBUG is set to any value', () => {
      const result = execSync(`node "${fixturePath}" isDebugSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('isDebugSimple: true')
    })

    it('should return true when DEBUG is set to 1', () => {
      const result = execSync(`node "${fixturePath}" isDebugSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '1' },
      })
      expect(result).toContain('isDebugSimple: true')
    })
  })

  describe('debugLogSimple', () => {
    it('should not log when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugLogSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('test message')
    })

    it('should log when DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugLogSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('test message')
      expect(result).toContain('arg2')
    })
  })

  describe('debugDirSimple', () => {
    it('should not output when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugDirSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('foo')
    })

    it('should output object when DEBUG is set', () => {
      const result = execSync(`node "${fixturePath}" debugDirSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })
  })

  describe('debugFnSimple', () => {
    it('should not log when DEBUG is not set', () => {
      const result = execSync(`node "${fixturePath}" debugFnSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '' },
      })
      expect(result).not.toContain('message from debugFnSimple')
    })

    it('should log when namespace matches wildcard', () => {
      const result = execSync(`node "${fixturePath}" debugFnSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*' },
      })
      expect(result).toContain('test:namespace')
      expect(result).toContain('message from debugFnSimple')
    })

    it('should log when namespace matches exact pattern', () => {
      const result = execSync(`node "${fixturePath}" debugFnSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'test:namespace' },
      })
      expect(result).toContain('message from debugFnSimple')
    })

    it('should log when namespace matches prefix pattern', () => {
      const result = execSync(`node "${fixturePath}" debugFnSimple`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: 'test:*' },
      })
      expect(result).toContain('message from debugFnSimple')
    })

    it('should not log when namespace is negated', () => {
      const result = execSync(`node "${fixturePath}" debugFnSimple-negation`, {
        encoding: 'utf8',
        env: { ...process.env, DEBUG: '*,-test:skip' },
      })
      expect(result).not.toContain('this should not appear')
    })

    it('should handle wildcard patterns without colon', () => {
      const result = execSync(`node "${fixturePath}" debugFnSimple-wildcard`, {
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
