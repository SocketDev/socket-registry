/**
 * @file Tests for data-view-byte-offset NPM package override. Ported 1:1 from
 *   upstream v1.0.1 (0160d9a9):
 *   https://github.com/inspect-js/data-view-byte-offset/blob/0160d9a9091666653b12dda2459c2ca0814a9af4/test/index.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: dataViewByteOffset,
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
      expect(() => dataViewByteOffset(nonDV)).toThrow(TypeError)
    }
  })

  describe('DataView', () => {
    it('returns the byteOffset originally passed to the DataView', () => {
      const ab = new ArrayBuffer(42)
      const dv = new DataView(ab, 2)
      expect(dataViewByteOffset(dv)).toBe(2)
      expect(dataViewByteOffset(dv)).toBe(dv.byteOffset)
    })
  })
})
