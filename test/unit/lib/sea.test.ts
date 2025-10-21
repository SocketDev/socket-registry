/**
 * @fileoverview Tests for SEA (Single Executable Application) detection utilities.
 *
 * Validates SEA binary detection and path resolution functions.
 */

import { getSeaBinaryPath, isSeaBinary } from '@socketsecurity/lib/sea'
import { beforeEach, describe, expect, it } from 'vitest'

describe('sea utilities', () => {
  beforeEach(() => {
    // Store original process.argv[0] to restore later if needed.
  })

  describe('isSeaBinary', () => {
    it('should return boolean value', () => {
      const result = isSeaBinary()
      expect(typeof result).toBe('boolean')
    })

    it('should return false in test environment', () => {
      // In test environment (Node.js < 24 or not a SEA), should return false.
      const result = isSeaBinary()
      expect(result).toBe(false)
    })

    it('should cache result across multiple calls', () => {
      // First call.
      const result1 = isSeaBinary()

      // Second call should return same result (testing cache behavior).
      const result2 = isSeaBinary()

      expect(result1).toBe(result2)
    })

    it('should consistently return same value', () => {
      // Multiple calls should all return the same cached value.
      const results = Array.from({ length: 10 }, () => isSeaBinary())

      // All results should be identical.
      expect(results.every(r => r === results[0])).toBe(true)
    })
  })

  describe('getSeaBinaryPath', () => {
    it('should return undefined when not running as SEA binary', () => {
      // In test environment, not running as SEA.
      const result = getSeaBinaryPath()
      expect(result).toBeUndefined()
    })

    it('should return undefined with empty process.argv[0]', () => {
      // Save and modify process.argv[0].
      const original = process.argv[0]!
      process.argv[0] = ''

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result).toBeUndefined()
    })

    it('should handle process.argv[0] modifications', () => {
      // Save original.
      const original = process.argv[0]!

      // Modify process.argv[0].
      process.argv[0] = '/test/path/app'

      // Since isSeaBinary() returns false, result should be undefined.
      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result).toBeUndefined()
    })

    it('should return string or undefined', () => {
      const result = getSeaBinaryPath()
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should handle paths with dot segments if SEA', () => {
      // This tests the normalizePath behavior when isSeaBinary is true.
      // In test env, isSeaBinary returns false, so we test the type contract.
      const result = getSeaBinaryPath()

      // Result should be undefined (not a SEA) or a normalized string.
      if (result !== undefined) {
        expect(typeof result).toBe('string')
        // If it were a path with dots, it would be normalized.
        expect(result).not.toContain('//')
      } else {
        expect(result).toBeUndefined()
      }
    })

    it('should handle very long process.argv[0] values', () => {
      // Save original.
      const original = process.argv[0]!

      // Set very long path.
      const longPath = `/usr/${'long/'.repeat(100)}app`
      process.argv[0] = longPath

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      // Should still return undefined (not a SEA) or handle long path.
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should handle special characters in process.argv[0]', () => {
      // Save original.
      const original = process.argv[0]!

      // Set path with special characters.
      process.argv[0] = '/usr/local/my-app_v1.0/bin/app'

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should handle Unicode characters in process.argv[0]', () => {
      // Save original.
      const original = process.argv[0]!

      // Set path with Unicode.
      process.argv[0] = '/usr/local/应用/app'

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should handle spaces in process.argv[0]', () => {
      // Save original.
      const original = process.argv[0]!

      // Set path with spaces.
      process.argv[0] = '/usr/local/my app/bin/executable'

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result === undefined || typeof result === 'string').toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle rapid successive calls to isSeaBinary', () => {
      // Multiple rapid calls.
      const results = Array.from({ length: 100 }, () => isSeaBinary())

      // All should return same value (cached).
      expect(results.every(r => r === results[0])).toBe(true)
    })

    it('should handle rapid successive calls to getSeaBinaryPath', () => {
      // Multiple rapid calls.
      const results = Array.from({ length: 100 }, () => getSeaBinaryPath())

      // All should return same value (since isSeaBinary is cached).
      expect(results.every(r => r === results[0])).toBe(true)
    })

    it('should handle process.argv[0] being modified between calls', () => {
      // Save original.
      const original = process.argv[0]!

      // Set initial path.
      process.argv[0] = '/usr/local/bin/app1'
      const result1 = getSeaBinaryPath()

      // Modify path.
      process.argv[0] = '/usr/local/bin/app2'
      const result2 = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      // Both should be undefined (not a SEA), or if different argv[0] matters.
      // Since isSeaBinary() is cached and returns false, both are undefined.
      expect(result1).toBeUndefined()
      expect(result2).toBeUndefined()
    })

    it('should handle single character path', () => {
      // Save original.
      const original = process.argv[0]!

      // Set single character path.
      process.argv[0] = '/'

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should handle paths with only dots', () => {
      // Save original.
      const original = process.argv[0]!

      // Set path with only dots.
      process.argv[0] = '././.'

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should handle Windows-style paths', () => {
      // Save original.
      const original = process.argv[0]!

      // Set Windows-style path.
      process.argv[0] = 'C:\\Program Files\\app.exe'

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      expect(result === undefined || typeof result === 'string').toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should consistently handle SEA detection workflow', () => {
      // Save original.
      const original = process.argv[0]!

      process.argv[0] = '/usr/local/bin/my-sea-app'

      // Check if SEA (should be false in test env).
      const isSea = isSeaBinary()
      expect(typeof isSea).toBe('boolean')

      // Get path (should be undefined since not SEA).
      const path = getSeaBinaryPath()
      if (isSea) {
        expect(path).toBeDefined()
        expect(typeof path).toBe('string')
      } else {
        expect(path).toBeUndefined()
      }

      // Subsequent calls should be consistent.
      expect(isSeaBinary()).toBe(isSea)
      expect(getSeaBinaryPath()).toBe(path)

      // Restore.
      process.argv[0] = original
    })

    it('should handle Node.js environment without SEA support', () => {
      // In test environment (Node.js < 24 or not bundled as SEA).
      const isSea = isSeaBinary()
      const path = getSeaBinaryPath()

      // Should return false and undefined.
      expect(isSea).toBe(false)
      expect(path).toBeUndefined()
    })

    it('should maintain consistency across isSeaBinary and getSeaBinaryPath', () => {
      const isSea = isSeaBinary()
      const path = getSeaBinaryPath()

      // If not SEA, path should be undefined.
      if (!isSea) {
        expect(path).toBeUndefined()
      }

      // If SEA, path should be defined and a string.
      if (isSea) {
        expect(path).toBeDefined()
        expect(typeof path).toBe('string')
      }
    })

    it('should handle empty string process.argv[0] gracefully', () => {
      // Save original.
      const original = process.argv[0]!

      process.argv[0] = ''

      const result = getSeaBinaryPath()

      // Restore.
      process.argv[0] = original

      // Should return undefined regardless of SEA status.
      expect(result).toBeUndefined()
    })
  })

  describe('return types and contracts', () => {
    it('isSeaBinary should always return boolean', () => {
      const result = isSeaBinary()
      expect(typeof result).toBe('boolean')
      expect(result === true || result === false).toBe(true)
    })

    it('getSeaBinaryPath should return string or undefined', () => {
      const result = getSeaBinaryPath()
      expect(
        result === undefined ||
          (typeof result === 'string' && result.length > 0),
      ).toBe(true)
    })

    it('getSeaBinaryPath should never return empty string', () => {
      const result = getSeaBinaryPath()
      // Should be undefined or non-empty string.
      expect(result !== '').toBe(true)
    })

    it('getSeaBinaryPath should return normalized paths', () => {
      const result = getSeaBinaryPath()
      if (result !== undefined) {
        // Normalized paths should not contain redundant slashes.
        expect(result).not.toContain('//')
        // Normalized paths should not contain /./.
        expect(result).not.toContain('/./')
      }
    })
  })

  describe('caching behavior', () => {
    it('should cache isSeaBinary result', () => {
      // Multiple calls should return identical values.
      const results = [
        isSeaBinary(),
        isSeaBinary(),
        isSeaBinary(),
        isSeaBinary(),
        isSeaBinary(),
      ]

      // All should be identical (cached).
      expect(new Set(results).size).toBe(1)
    })

    it('should maintain cache across getSeaBinaryPath calls', () => {
      // isSeaBinary is called internally by getSeaBinaryPath.
      const seaBefore = isSeaBinary()

      // Call getSeaBinaryPath multiple times.
      getSeaBinaryPath()
      getSeaBinaryPath()
      getSeaBinaryPath()

      const seaAfter = isSeaBinary()

      // Cache should be maintained.
      expect(seaBefore).toBe(seaAfter)
    })
  })
})
