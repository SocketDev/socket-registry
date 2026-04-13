/**
 * @fileoverview Tests for string.prototype.matchall NPM package override.
 * Ported 1:1 from upstream v4.0.12 (c3d18708):
 * https://github.com/es-shims/String.prototype.matchAll/blob/c3d18708/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: matchAll,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const collectResults = (iterator: any) => {
  const results = []
  let result = iterator.next()
  while (!result.done) {
    results.push(result.value)
    result = iterator.next()
  }
  return results
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('passing a string instead of a regex', () => {
    const str = 'aabcaba'
    const strResults = collectResults(matchAll(str, 'a'))
    const regexResults = collectResults(matchAll(str, /a/g))
    expect(strResults.length).toBe(regexResults.length)
    for (let i = 0; i < strResults.length; i++) {
      expect(strResults[i][0]).toBe(regexResults[i][0])
      expect(strResults[i].index).toBe(regexResults[i].index)
    }
  })

  it('returns an iterator', () => {
    const str = 'aabc'
    const iterator = matchAll(str, /[ac]/g)
    expect(iterator).toBeTruthy()
    expect(Object.prototype.hasOwnProperty.call(iterator, 'next')).toBe(false)
    const results = collectResults(iterator)
    expect(results.length).toBe(3)
    expect(results[0][0]).toBe('a')
    expect(results[0].index).toBe(0)
    expect(results[1][0]).toBe('a')
    expect(results[1].index).toBe(1)
    expect(results[2][0]).toBe('c')
    expect(results[2].index).toBe(3)
  })

  it('throws with a non-global regex', () => {
    const str = 'AaBbCc'
    expect(() => matchAll(str, /[bc]/i)).toThrow(TypeError)
  })

  it('works with a global regex', () => {
    const str = 'AaBbCc'
    const results = collectResults(matchAll(str, /[bc]/gi))
    expect(results.length).toBe(4)
    expect(results[0][0]).toBe('B')
    expect(results[1][0]).toBe('b')
    expect(results[2][0]).toBe('C')
    expect(results[3][0]).toBe('c')
  })

  it('respects flags', () => {
    const str = 'A\na\nb\nC'
    const results = collectResults(matchAll(str, /^[ac]/gim))
    expect(results.length).toBe(3)
    expect(results[0][0]).toBe('A')
    expect(results[1][0]).toBe('a')
    expect(results[2][0]).toBe('C')
  })

  describe('zero-width matches', () => {
    it('global', () => {
      const str = 'abcde'
      const results = collectResults(matchAll(str, /\B/g))
      expect(results.length).toBe(4)
      expect(results[0].index).toBe(1)
      expect(results[1].index).toBe(2)
      expect(results[2].index).toBe(3)
      expect(results[3].index).toBe(4)
    })
  })
})
