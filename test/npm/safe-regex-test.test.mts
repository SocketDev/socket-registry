/**
 * @fileoverview Tests for safe-regex-test NPM package override.
 * Ported 1:1 from upstream v1.1.0 (9360cf07):
 * https://github.com/ljharb/safe-regex-test/blob/9360cf07/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: regexTester,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof regexTester).toBe('function')
  })

  it('throws on non-regexes', () => {
    const nonRegexes = [
      undefined,
      undefined,
      true,
      false,
      0,
      42,
      NaN,
      Infinity,
      '',
      'foo',
      [],
      {},
      () => {},
    ]
    for (const val of nonRegexes) {
      expect(() => regexTester(val)).toThrow(TypeError)
    }
  })

  it('returns a tester function for regexes', () => {
    const tester = regexTester(/a/)
    expect(typeof tester).toBe('function')
    expect(tester('a')).toBe(true)
    expect(tester('b')).toBe(false)
    expect(tester('a')).toBe(true)
  })
})
