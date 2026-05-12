/**
 * @fileoverview Tests for array-buffer-byte-length NPM package override.
 * Ported 1:1 from upstream v1.0.2 (59deea89141b4aeeb64122e5e15efda485942c00):
 * https://github.com/inspect-js/array-buffer-byte-length/blob/59deea89141b4aeeb64122e5e15efda485942c00/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: byteLength,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('returns NaN for non-ArrayBuffer values', () => {
    const nonABs = [
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
      /a/g,
      new Date(),
      () => {},
    ]
    for (let i = 0, { length } = nonABs; i < length; i += 1) {
      const nonAB = nonABs[i]
      expect(byteLength(nonAB)).toBeNaN()
    }
  })

  describe('ArrayBuffers', () => {
    it('works on an ArrayBuffer of length 32', () => {
      const ab32 = new ArrayBuffer(32)
      expect(byteLength(ab32)).toBe(32)
    })

    it('works on an ArrayBuffer of length 0', () => {
      const ab0 = new ArrayBuffer(0)
      expect(byteLength(ab0)).toBe(0)
    })

    it('a DataView returns NaN', () => {
      const ab32 = new ArrayBuffer(32)
      const dv = new DataView(ab32)
      expect(byteLength(dv)).toBeNaN()
    })
  })
})
