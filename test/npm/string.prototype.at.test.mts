/**
 * @fileoverview Tests for string.prototype.at NPM package override.
 * Ported 1:1 from upstream v1.0.6 (515b26f9):
 * https://github.com/es-shims/String.prototype.at/blob/515b26f9/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: at,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('strings', () => {
    it('returns character at positive index', () => {
      expect(at('abc', 0)).toBe('a')
      expect(at('abc', 1)).toBe('b')
      expect(at('abc', 2)).toBe('c')
    })

    it('returns character at negative index', () => {
      expect(at('abc', -3)).toBe('a')
      expect(at('abc', -2)).toBe('b')
      expect(at('abc', -1)).toBe('c')
    })

    it('returns undefined for out-of-bounds index', () => {
      expect(at('abc', 3)).toBe(undefined)
      expect(at('abc', -4)).toBe(undefined)
      expect(at('abc', Infinity)).toBe(undefined)
      expect(at('abc', -Infinity)).toBe(undefined)
    })
  })
})
