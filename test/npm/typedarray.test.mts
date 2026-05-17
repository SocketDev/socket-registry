/**
 * @fileoverview Tests for typedarray NPM package override.
 * Ported 1:1 from upstream v0.0.7 (f7387a01):
 * https://github.com/es-shims/typedarray/blob/f7387a01/test/tarray.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: TA,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('tiny u8a test', () => {
    const ua = new TA.Uint8Array(5)
    expect(ua.length).toBe(5)
    ua[1] = 256 + 55
    expect(ua[1]).toBe(55)
  })
})
