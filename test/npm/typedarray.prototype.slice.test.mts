/**
 * @fileoverview Tests for typedarray.prototype.slice NPM package override.
 * Ported 1:1 from upstream v1.0.5 (3d0a3276):
 * https://github.com/es-shims/TypedArray.prototype.slice/blob/3d0a3276/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: slice,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

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
] as const

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws for non-typed-array values', () => {
    const nonTAs = [
      undefined,
      null,
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
    for (const nonTA of nonTAs) {
      expect(() => slice(nonTA)).toThrow(TypeError)
    }
  })

  describe('Typed Arrays', () => {
    for (const name of typedArrayNames) {
      const TA = globalThis[name]
      if (typeof TA !== 'function') {
        continue
      }
      const isBigInt = name.slice(0, 3) === 'Big'

      it(`${name}: returns a new instance when sliced with no args`, () => {
        const ta = new (TA as any)(
          isBigInt ? [BigInt(1), BigInt(2), BigInt(3)] : [1, 2, 3],
        )
        const copy = slice(ta)
        expect(copy).not.toBe(ta)
        expect(copy).toBeInstanceOf(TA)
        expect(Array.from(copy)).toEqual(Array.from(ta))
        expect(copy.buffer).not.toBe(ta.buffer)
      })

      it(`${name}: returns subset when sliced with start index`, () => {
        const ta = new (TA as any)(
          isBigInt ? [BigInt(1), BigInt(2), BigInt(3)] : [1, 2, 3],
        )
        const subset = slice(ta, 1)
        expect(subset).not.toBe(ta)
        const expected = new (TA as any)(
          isBigInt ? [BigInt(2), BigInt(3)] : [2, 3],
        )
        expect(Array.from(subset)).toEqual(Array.from(expected))
      })
    }
  })
})
