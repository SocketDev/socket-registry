import { describe, expect, it } from 'vitest'

import { getSeaBinaryPath, isSeaBinary } from '../../registry/dist/lib/sea.js'

describe('sea module', () => {
  describe('isSeaBinary', () => {
    it('should return a boolean', () => {
      const result = isSeaBinary()
      expect(typeof result).toBe('boolean')
    })

    it('should return false in test environment', () => {
      const result = isSeaBinary()
      expect(result).toBe(false)
    })

    it('should cache the result', () => {
      const first = isSeaBinary()
      const second = isSeaBinary()
      expect(first).toBe(second)
    })
  })

  describe('getSeaBinaryPath', () => {
    it('should return undefined in test environment', () => {
      const result = getSeaBinaryPath()
      expect(result).toBeUndefined()
    })

    it('should return undefined when not running as SEA', () => {
      const result = getSeaBinaryPath()
      expect(result).toBeUndefined()
    })
  })
})
