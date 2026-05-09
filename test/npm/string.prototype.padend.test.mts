/**
 * @fileoverview Tests for string.prototype.padend NPM package override.
 * Ported 1:1 from upstream v3.1.6 (674778e9):
 * https://github.com/es-shims/String.prototype.padEnd/blob/674778e9/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: padEnd,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('normal cases', () => {
    it('pads end with single character', () => {
      expect(padEnd('a', 3, 'b')).toBe('abb')
    })

    it('noops when string is already of maximum length', () => {
      expect(padEnd('abc', 3, 'd')).toBe('abc')
    })

    it('noops when string is larger than maximum length', () => {
      expect(padEnd('abc', -3, 'd')).toBe('abc')
    })

    it('pads when max length equals length plus filler', () => {
      expect(padEnd('cd', 3, 'ab')).toBe('cda')
    })

    it('noops with absent maximum length', () => {
      expect(padEnd('abc')).toBe('abc')
    })

    it('defaults fillStr to a space', () => {
      expect(padEnd('a', 3)).toBe('a  ')
    })

    it('stringifies non-string fillStr', () => {
      expect(padEnd('ed', 6, undefined)).toBe('ednull')
    })
  })

  describe('truncated fill string', () => {
    it('truncates at the provided max length', () => {
      expect(padEnd('a', 2, 'bc')).toBe('ab')
    })
  })
})
