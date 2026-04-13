/**
 * @fileoverview Tests for which-collection NPM package override.
 * Ported 1:1 from upstream v1.0.2 (fda9470d):
 * https://github.com/inspect-js/which-collection/blob/fda9470d/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: whichCollection,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('returns false for non-collections', () => {
    const nonCollections = [
      null,
      undefined,
      true,
      false,
      42,
      0,
      -0,
      NaN,
      Infinity,
      '',
      'foo',
      /a/g,
      [],
      {},
      function () {},
    ]
    for (const nonCollection of nonCollections) {
      expect(whichCollection(nonCollection)).toBe(false)
    }
  })

  it('returns "Map" for Maps', () => {
    expect(whichCollection(new Map())).toBe('Map')
  })

  it('returns "Set" for Sets', () => {
    expect(whichCollection(new Set())).toBe('Set')
  })

  it('returns "WeakMap" for WeakMaps', () => {
    expect(whichCollection(new WeakMap())).toBe('WeakMap')
  })

  it('returns "WeakSet" for WeakSets', () => {
    expect(whichCollection(new WeakSet())).toBe('WeakSet')
  })
})
