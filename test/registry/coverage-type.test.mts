/**
 * @fileoverview Tests for TypeScript type coverage utilities.
 */

import { getTypeCoverage } from '@socketsecurity/lib/cover/type'
import { describe, expect, it } from 'vitest'

describe('type coverage module', () => {
  describe('getTypeCoverage', () => {
    it('should return null when type-coverage is not available', async () => {
      const result = await getTypeCoverage({ generateIfMissing: false })

      expect(result).toBeNull()
    })

    it('should throw error when cwd is empty string', async () => {
      await expect(getTypeCoverage({ cwd: '' })).rejects.toThrow(
        'Working directory is required.',
      )
    })

    it('should use default options when called without arguments', async () => {
      const result = await getTypeCoverage()

      expect(result).toBeNull()
    })

    it('should handle missing cwd option with default', async () => {
      const result = await getTypeCoverage({ generateIfMissing: false })

      expect(result).toBeNull()
    })
  })
})
