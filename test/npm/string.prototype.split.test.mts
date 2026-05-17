/**
 * @fileoverview Tests for string.prototype.split NPM package override.
 * Ported 1:1 from upstream v1.0.9 (9aa9b69d):
 * https://github.com/es-shims/String.prototype.split/blob/9aa9b69d/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: split,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('undefined separator returns array with receiver', () => {
    expect(split('ab')).toEqual(['ab'])
    expect(split('ab', undefined)).toEqual(['ab'])
  })

  it('zero limit returns empty array', () => {
    expect(split('ab', undefined, 0)).toEqual([])
  })

  describe('limit argument', () => {
    it('respects limit', () => {
      expect(split('a b', / /, 0)).toEqual([])
      expect(split('a b', / /, 1)).toEqual(['a'])
      expect(split('a b', / /, 2)).toEqual(['a', 'b'])
      expect(split('a b', / /, 3)).toEqual(['a', 'b'])
    })
  })

  describe('empty space receiver', () => {
    it('handles empty strings', () => {
      expect(split('')).toEqual([''])
      expect(split('', /./)).toEqual([''])
      expect(split('', /.?/)).toEqual([])
      expect(split('', /.??/)).toEqual([])
    })
  })

  describe('extra tests', () => {
    it('splits with various regex patterns', () => {
      expect(split('ab', /a*/)).toEqual(['', 'b'])
      expect(split('ab', /a*?/)).toEqual(['a', 'b'])
      expect(split('ab', /(?:ab)/)).toEqual(['', ''])
      expect(split('ab', /(?:ab)*/)).toEqual(['', ''])
      expect(split('ab', /(?:ab)*?/)).toEqual(['a', 'b'])
    })

    it('splits with string separator', () => {
      expect(split('test', '')).toEqual(['t', 'e', 's', 't'])
      expect(split('test')).toEqual(['test'])
      expect(split('111', 1)).toEqual(['', '', '', ''])
    })

    it('splits with empty regex and various limits', () => {
      expect(split('test', /(?:)/, undefined)).toEqual(['t', 'e', 's', 't'])
      expect(split('test', /(?:)/)).toEqual(['t', 'e', 's', 't'])
      expect(split('test', /(?:)/, 4)).toEqual(['t', 'e', 's', 't'])
      expect(split('test', /(?:)/, 3)).toEqual(['t', 'e', 's'])
      expect(split('test', /(?:)/, 2)).toEqual(['t', 'e'])
      expect(split('test', /(?:)/, 1)).toEqual(['t'])
      expect(split('test', /(?:)/, 0)).toEqual([])
    })

    it('splits with dash patterns', () => {
      expect(split('a', /-/)).toEqual(['a'])
      expect(split('a', /-?/)).toEqual(['a'])
      expect(split('a', /-??/)).toEqual(['a'])

      expect(split('a-b', /-/)).toEqual(['a', 'b'])
      expect(split('a-b', /-?/)).toEqual(['a', 'b'])
      expect(split('a-b', /-??/)).toEqual(['a', '-', 'b'])

      expect(split('a--b', /-/)).toEqual(['a', '', 'b'])
      expect(split('a--b', /-?/)).toEqual(['a', '', 'b'])
      expect(split('a--b', /-??/)).toEqual(['a', '-', '-', 'b'])
    })

    it('splits with capturing groups', () => {
      expect(split('test', 't')).toEqual(['', 'es', ''])
      expect(split('test', /t/)).toEqual(['', 'es', ''])
      expect(split('test', /(t)/)).toEqual(['', 't', 'es', 't', ''])

      expect(split('test', 'es')).toEqual(['t', 't'])
      expect(split('test', /es/)).toEqual(['t', 't'])
      expect(split('test', /(es)/)).toEqual(['t', 'es', 't'])

      expect(split('test', /(t)(e)(s)(t)/)).toEqual([
        '',
        't',
        'e',
        's',
        't',
        '',
      ])
    })

    it('splits with complex HTML pattern', () => {
      expect(
        split('A<B>bold</B>and<CODE>coded</CODE>', /<(\/)?([^<>]+)>/),
      ).toEqual([
        'A',
        undefined,
        'B',
        'bold',
        '/',
        'B',
        'and',
        undefined,
        'CODE',
        'coded',
        '/',
        'CODE',
        '',
      ])
    })

    it('splits with repeated capture groups', () => {
      expect(split('tesst', /(s)*/)).toEqual(['t', undefined, 'e', 's', 't'])
      expect(split('tesst', /(s)*?/)).toEqual([
        't',
        undefined,
        'e',
        undefined,
        's',
        undefined,
        's',
        undefined,
        't',
      ])
      expect(split('tesst', /(s*)/)).toEqual(['t', '', 'e', 'ss', 't'])
      expect(split('tesst', /(s*?)/)).toEqual([
        't',
        '',
        'e',
        '',
        's',
        '',
        's',
        '',
        't',
      ])
      expect(split('tesst', /(?:s)*/)).toEqual(['t', 'e', 't'])
      expect(split('tesst', /(?=s+)/)).toEqual(['te', 's', 'st'])
    })
  })
})
