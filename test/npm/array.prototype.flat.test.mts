/**
 * @file Tests for array.prototype.flat NPM package override. Ported 1:1 from
 *   upstream v1.3.3 (a0fa5660c4b1cf49ca9833329ca98aa8e956ed50):
 *   https://github.com/es-shims/Array.prototype.flat/blob/a0fa5660c4b1cf49ca9833329ca98aa8e956ed50/test/tests.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: flat,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

// Assertions are inlined into each it() (rather than a shared helper) so they
// live inside the test body — a standalone expect() in a module-scope helper
// runs at collection time, not as a test assertion
// (socket/no-vitest-standalone-expect).
describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('flattens', () => {
    it('missing depth only flattens 1 deep', () => {
      expect(flat([1, [2], [[3]], [[['four']]]])).toEqual([1, 2, [3], [['four']]])
      expect(flat([1, [2], [[3]], [[['four']]]]).length).toBe(4)
    })

    it('depth of 1 only flattens 1 deep', () => {
      expect(flat([1, [2], [[3]], [[['four']]]], 1)).toEqual([
        1,
        2,
        [3],
        [['four']],
      ])
      expect(flat([1, [2], [[3]], [[['four']]]], 1)).not.toEqual([
        1,
        2,
        3,
        ['four'],
      ])
    })

    it('depth of 2 only flattens 2 deep', () => {
      expect(flat([1, [2], [[3]], [[['four']]]], 2)).toEqual([1, 2, 3, ['four']])
      expect(flat([1, [2], [[3]], [[['four']]]], 2)).not.toEqual([
        1,
        2,
        3,
        'four',
      ])
    })

    it('depth of 3 only flattens 3 deep', () => {
      expect(flat([1, [2], [[3]], [[['four']]]], 3)).toEqual([1, 2, 3, 'four'])
    })

    it('depth of Infinity flattens all the way', () => {
      expect(flat([1, [2], [[3]], [[['four']]]], Infinity)).toEqual([
        1,
        2,
        3,
        'four',
      ])
    })
  })

  describe('sparse arrays', () => {
    it('an array hole is treated the same as an empty array', () => {
      // eslint-disable-next-line no-sparse-arrays
      expect(flat([, [1]])).toEqual(flat([[], [1]]))
    })
  })
})
