/**
 * @fileoverview Tests for is-array-buffer NPM package override.
 * Ported 1:1 from upstream v3.0.5 (9a91db98):
 * https://github.com/inspect-js/is-array-buffer/blob/9a91db98411737952175ef8d6ede3301e570fbc1/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isArrayBuffer,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof isArrayBuffer).toBe('function')
  })

  it('returns false for non-ArrayBuffer values', () => {
    const nonABs: unknown[] = [
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
    if (typeof SharedArrayBuffer === 'function') {
      nonABs.push(new SharedArrayBuffer(0))
    }
    for (let i = 0, { length } = nonABs; i < length; i += 1) {
      const nonAB = nonABs[i]!
      expect(isArrayBuffer(nonAB)).toBe(false)
    }
  })

  describe(
    'actual ArrayBuffer instances',
    { skip: typeof ArrayBuffer === 'undefined' },
    () => {
      it('empty ArrayBuffer is an ArrayBuffer', () => {
        expect(isArrayBuffer(new ArrayBuffer(0))).toBe(true)
      })

      it('ArrayBuffer(42) is an ArrayBuffer', () => {
        const ab42 = new ArrayBuffer(42)
        expect(isArrayBuffer(ab42)).toBe(true)
      })

      it('DataView is not an ArrayBuffer', () => {
        const ab42 = new ArrayBuffer(42)
        const dv = new DataView(ab42)
        expect(isArrayBuffer(dv)).toBe(false)
      })
    },
  )

  describe('Typed Arrays', () => {
    const typedArrayNames = [
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array',
      'BigInt64Array',
      'BigUint64Array',
    ]

    for (let i = 0, { length } = typedArrayNames; i < length; i += 1) {
      const name = typedArrayNames[i]!
      const TypedArray = (globalThis as any)[name]
      if (typeof TypedArray === 'function') {
        it(`${name} buffer is an ArrayBuffer`, () => {
          const ta = new TypedArray(0)
          expect(isArrayBuffer(ta.buffer)).toBe(true)
        })

        it(`${name} instance is not an ArrayBuffer`, () => {
          const ta = new TypedArray(0)
          expect(isArrayBuffer(ta)).toBe(false)
        })
      }
    }
  })
})
