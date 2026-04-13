/**
 * @fileoverview Tests for asynciterator.prototype NPM package override.
 * Ported 1:1 from upstream v1.0.0 (52d27148):
 * https://github.com/ljharb/AsyncIterator.prototype/blob/52d2714890b4af4d5436e368e7038dcb667ead82/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: asyncIterProto,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is truthy', () => {
    expect(asyncIterProto).toBeTruthy()
  })

  it('is an object', () => {
    expect(typeof asyncIterProto).toBe('object')
  })

  it('Symbol.iterator returns receiver', () => {
    const fn = asyncIterProto[Symbol.iterator]
    expect(typeof fn).toBe('function')

    const sentinel = {}
    expect(fn.call(sentinel)).toBe(sentinel)
  })
})
