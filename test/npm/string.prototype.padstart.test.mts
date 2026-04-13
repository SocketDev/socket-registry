/**
 * @fileoverview Tests for string.prototype.padstart NPM package override.
 * Ported 1:1 from upstream v3.1.7 (24c67699):
 * https://github.com/es-shims/String.prototype.padStart/blob/24c67699/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: padStart,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('normal cases', () => {
    it('pads start with single character', () => {
      expect(padStart('a', 3, 'b')).toBe('bba')
    })

    it('noops when string is already of maximum length', () => {
      expect(padStart('abc', 3, 'd')).toBe('abc')
    })

    it('noops when string is larger than maximum length', () => {
      expect(padStart('abc', -3, 'd')).toBe('abc')
    })

    it('pads when max length equals length plus filler', () => {
      expect(padStart('cd', 3, 'ab')).toBe('acd')
    })

    it('noops with absent maximum length', () => {
      expect(padStart('abc')).toBe('abc')
    })

    it('defaults fillStr to a space', () => {
      expect(padStart('a', 3)).toBe('  a')
    })

    it('stringifies non-string fillStr', () => {
      expect(padStart('ed', 6, null)).toBe('nulled')
    })
  })

  describe('truncated fill string', () => {
    it('truncates at the provided max length', () => {
      expect(padStart('a', 2, 'bc')).toBe('ba')
    })
  })
})
