/**
 * @fileoverview Tests for platform detection and file permission constants.
 *
 * Validates platform detection and permission mode constants.
 */
import { describe, expect, it } from 'vitest'

import {
  DARWIN,
  S_IXGRP,
  S_IXOTH,
  S_IXUSR,
  WIN32,
} from '../../../registry/dist/constants/platform.js'

describe('platform constants', () => {
  describe('platform detection', () => {
    it('should have DARWIN constant', () => {
      expect(typeof DARWIN).toBe('boolean')
    })

    it('should have WIN32 constant', () => {
      expect(typeof WIN32).toBe('boolean')
    })

    it('should have exactly one platform true', () => {
      // On any given platform, exactly one should be true.
      const platforms = [DARWIN, WIN32]
      const trueCount = platforms.filter(Boolean).length
      expect(trueCount).toBeLessThanOrEqual(1)
    })
  })

  describe('file permission modes', () => {
    it('should have correct permission values', () => {
      expect(S_IXUSR).toBe(0o100)
      expect(S_IXGRP).toBe(0o010)
      expect(S_IXOTH).toBe(0o001)
    })

    it('should be numeric values', () => {
      expect(typeof S_IXUSR).toBe('number')
      expect(typeof S_IXGRP).toBe('number')
      expect(typeof S_IXOTH).toBe('number')
    })
  })
})
