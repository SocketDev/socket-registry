/**
 * @fileoverview Tests for has-proto NPM package override.
 * Ported 1:1 from upstream v1.2.0 (8f9ec131):
 * https://github.com/inspect-js/has-proto/blob/8f9ec1310fbedee155bd1022941a3fd80ef835f6/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: hasProto,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('returns a boolean', () => {
    const result = hasProto()
    expect(typeof result).toBe('boolean')
  })

  it('correctly detects __proto__ support', () => {
    const result = hasProto()
    const obj = { __proto__: null }
    if (result) {
      expect('toString' in obj).toBe(false)
    } else {
      expect('toString' in obj).toBe(true)
    }
  })
})
