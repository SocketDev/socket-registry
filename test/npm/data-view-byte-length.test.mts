/**
 * @file Tests for data-view-byte-length NPM package override. Ported 1:1 from
 *   upstream v1.0.2 (76b05f64):
 *   https://github.com/inspect-js/data-view-byte-length/blob/76b05f64f4ecdca09df1a5f9f40501ca903f9bd8/test/index.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: dataViewByteLength,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws a TypeError for non-DataView values', () => {
    const nonDataViews = [
      undefined,
      null,
      false,
      true,
      0,
      -0,
      42,
      Infinity,
      NaN,
      '',
      'foo',
      42n,
      Symbol('sym'),
      {},
      [],
      /a/g,
      new Date(),
      () => {},
      new ArrayBuffer(1),
      new Uint8Array(1),
    ]
    for (let i = 0, { length } = nonDataViews; i < length; i += 1) {
      const nonDV = nonDataViews[i]!
      expect(() => dataViewByteLength(nonDV)).toThrow(TypeError)
    }
  })

  describe('DataView', () => {
    it('returns the byteLength of the DataView', () => {
      const ab = new ArrayBuffer(42)
      const dv = new DataView(ab)
      expect(dataViewByteLength(dv)).toBe(42)
      expect(dataViewByteLength(dv)).toBe(dv.byteLength)
    })
  })
})
