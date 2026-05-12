/**
 * @fileoverview Tests for typed-array-buffer NPM package override.
 * Ported 1:1 from upstream v1.0.3 (a4141b67):
 * https://github.com/inspect-js/typed-array-buffer/blob/a4141b67/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: typedArrayBuffer,
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
    for (let i = 0, { length } = nonTAs; i < length; i += 1) {
      const nonTA = nonTAs[i]
      expect(() => typedArrayBuffer(nonTA)).toThrow(TypeError)
    }
  })

  it('returns the buffer of typed arrays', () => {
    for (let i = 0, { length } = typedArrayNames; i < length; i += 1) {
      const name = typedArrayNames[i]!
      const TA = globalThis[name]
      if (typeof TA === 'function') {
        const ta = new TA(0)
        expect(typedArrayBuffer(ta)).toBe(ta.buffer)
      }
    }
  })
})
