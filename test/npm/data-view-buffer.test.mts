/**
 * @file Tests for data-view-buffer NPM package override. Ported 1:1 from
 *   upstream v1.0.2 (38603a5b):
 *   https://github.com/inspect-js/data-view-buffer/blob/38603a5b40cc02824054ec549cbf4a14c96cca41/test/index.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: dataViewBuffer,
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
      expect(() => dataViewBuffer(nonDV)).toThrow(TypeError)
    }
  })

  describe('DataView', () => {
    it('returns the buffer originally passed to the DataView', () => {
      const ab = new ArrayBuffer(1)
      const dv = new DataView(ab)
      expect(dataViewBuffer(dv)).toBe(ab)
      expect(dataViewBuffer(dv)).toBe(dv.buffer)
    })
  })
})
