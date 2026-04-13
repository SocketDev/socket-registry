/**
 * @fileoverview Tests for iterator.prototype NPM package override.
 * Ported 1:1 from upstream v1.1.5 (9cd8a50f):
 * https://github.com/ljharb/Iterator.prototype/blob/9cd8a50f98006f3d13da871a971c174ea29edb0c/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: iterProto,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is truthy', () => {
    expect(iterProto).toBeTruthy()
  })

  it('is an object', () => {
    expect(typeof iterProto).toBe('object')
  })

  it('is not Object.prototype', () => {
    expect(iterProto).not.toBe(Object.prototype)
  })

  it('Symbol.iterator returns receiver', () => {
    const fn = iterProto[Symbol.iterator]
    expect(typeof fn).toBe('function')

    const sentinel = {}
    expect(fn.call(sentinel)).toBe(sentinel)
  })

  it('ArrayIterator [[Prototype]] is Iterator.prototype', () => {
    const grandProto = Object.getPrototypeOf(Object.getPrototypeOf([].keys()))
    if (grandProto === Object.prototype) {
      return
    }
    expect(grandProto).toBe(iterProto)
  })

  it('SetIterator [[Prototype]] is Iterator.prototype', () => {
    const grandProto = Object.getPrototypeOf(
      Object.getPrototypeOf(new Set().keys()),
    )
    if (grandProto === Object.prototype) {
      return
    }
    expect(grandProto).toBe(iterProto)
  })
})
