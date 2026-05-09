/**
 * @fileoverview Tests for is-shared-array-buffer NPM package override.
 * Ported 1:1 from upstream v1.0.4 (9ccbf054):
 * https://github.com/inspect-js/is-shared-array-buffer/blob/9ccbf054625ea8b05f753bec04a510f091147d2b/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isSharedArrayBuffer,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof isSharedArrayBuffer).toBe('function')
  })

  it('returns false for non-SharedArrayBuffer values', () => {
    const nonSABs: unknown[] = [
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
    for (const nonSAB of nonSABs) {
      expect(isSharedArrayBuffer(nonSAB)).toBe(false)
    }
  })

  describe(
    'actual SharedArrayBuffer instances',
    { skip: typeof SharedArrayBuffer === 'undefined' },
    () => {
      it('SharedArrayBuffer is a SharedArrayBuffer', () => {
        const sab = new SharedArrayBuffer(0)
        expect(isSharedArrayBuffer(sab)).toBe(true)
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

    for (const name of typedArrayNames) {
      const TypedArray = (globalThis as any)[name]
      if (typeof TypedArray === 'function') {
        it(`${name} buffer is not a SharedArrayBuffer`, () => {
          const ta = new TypedArray(0)
          expect(isSharedArrayBuffer(ta.buffer)).toBe(false)
        })

        it(`${name} instance is not a SharedArrayBuffer`, () => {
          const ta = new TypedArray(0)
          expect(isSharedArrayBuffer(ta)).toBe(false)
        })
      }
    }
  })
})
