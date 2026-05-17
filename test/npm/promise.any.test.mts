/**
 * @fileoverview Tests for promise.any NPM package override.
 * Ported 1:1 from upstream v2.0.6 (cd47c039):
 * https://github.com/es-shims/Promise.any/blob/cd47c0397d3655cd56305cc98a42f8d8fb85f3bb/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: any,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const a = {}
  const b = {}
  const c = {}

  it('empty iterable', async () => {
    try {
      await any([])
      expect.unreachable('should not resolve')
    } catch (error: any) {
      expect(error instanceof AggregateError).toBe(true)
      expect(error.errors).toEqual([])
    }
  })

  it('no promise values', async () => {
    const result = await any([a, b, c])
    expect(result).toEqual(a)
  })

  it('all fulfilled', async () => {
    const result = await any([
      Promise.resolve(a),
      Promise.resolve(b),
      Promise.resolve(c),
    ])
    expect(result).toEqual(a)
  })

  it('all rejected', async () => {
    try {
      await any([Promise.reject(a), Promise.reject(b), Promise.reject(c)])
      expect.unreachable('should not resolve')
    } catch (error: any) {
      expect(error instanceof AggregateError).toBe(true)
      expect(error.errors).toEqual([a, b, c])
    }
  })

  it('mixed - first non-promise wins', async () => {
    const result = await any([a, Promise.resolve(b), Promise.reject(c)])
    expect(result).toEqual(a)
  })

  it('mixed - first resolved wins', async () => {
    const result = await any([
      Promise.reject(a),
      Promise.resolve(b),
      Promise.reject(c),
    ])
    expect(result).toEqual(b)
  })

  it('poisoned .then', async () => {
    const poison = new EvalError()
    const promise = new Promise(function () {})
    // eslint-disable-next-line unicorn/no-thenable
    ;(promise as any).then = function () {
      throw poison
    }
    try {
      await any([promise])
      expect.unreachable('should not reach here')
    } catch (error: any) {
      expect(error).toBe(poison)
    }
  })
})
