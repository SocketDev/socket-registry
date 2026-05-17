/**
 * @fileoverview Tests for arraybuffer.prototype.slice NPM package override.
 * Ported 1:1 from upstream v1.0.4 (d8ac7211):
 * https://github.com/es-shims/ArrayBuffer.prototype.slice/blob/d8ac72119e74c40234e6da003763fa564d49ac0e/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: slice,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws for non-ArrayBuffer values', () => {
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
      {},
      [],
      function () {},
      /a/g,
    ]
    for (let i = 0, { length } = nonABs; i < length; i += 1) {
      const nonAB = nonABs[i]
      expect(() => slice(nonAB)).toThrow(TypeError)
    }
  })

  describe('ArrayBuffers', { skip: typeof ArrayBuffer === 'undefined' }, () => {
    it('slices an empty ArrayBuffer', () => {
      const ab = new ArrayBuffer(0)
      const nb = slice(ab)
      expect(nb).not.toBe(ab)
    })

    it('slices with start offset', () => {
      const ab2 = new ArrayBuffer(8)
      expect(ab2.byteLength).toBe(8)
      const nbLen = slice(ab2, 4)
      expect(nbLen.byteLength).toBe(4)
    })

    it('slice produces an independent copy', () => {
      const one = new ArrayBuffer(1)
      const arr = new Uint8Array(one)
      arr[0] = 123

      const two = slice(one)
      const arr2 = new Uint8Array(two)
      arr2[0] = 234

      expect(arr).toEqual(new Uint8Array([123]))
      expect(arr2).toEqual(new Uint8Array([234]))
    })
  })

  describe(
    'SharedArrayBuffers',
    { skip: typeof SharedArrayBuffer === 'undefined' },
    () => {
      it('throws for SharedArrayBuffer', () => {
        const sab = new SharedArrayBuffer(0)
        expect(() => slice(sab)).toThrow(TypeError)
      })
    },
  )
})
