/**
 * @fileoverview Tests for promise.allsettled NPM package override.
 * Ported 1:1 from upstream v1.0.7 (3d082d99):
 * https://github.com/es-shims/Promise.allSettled/blob/3d082d994f0899a16e40eb5cce901340290581dc/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: allSettled,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const yes = (value: any) => ({ status: 'fulfilled', value })
const no = (reason: any) => ({ status: 'rejected', reason })

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const a = {}
  const b = {}
  const c = {}

  it('no promise values', async () => {
    const results = await allSettled([a, b, c])
    expect(results).toEqual([yes(a), yes(b), yes(c)])
  })

  it('all fulfilled', async () => {
    const results = await allSettled([
      Promise.resolve(a),
      Promise.resolve(b),
      Promise.resolve(c),
    ])
    expect(results).toEqual([yes(a), yes(b), yes(c)])
  })

  it('all rejected', async () => {
    const results = await allSettled([
      Promise.reject(a),
      Promise.reject(b),
      Promise.reject(c),
    ])
    expect(results).toEqual([no(a), no(b), no(c)])
  })

  it('mixed', async () => {
    const results = await allSettled([a, Promise.resolve(b), Promise.reject(c)])
    expect(results).toEqual([yes(a), yes(b), no(c)])
  })

  it('poisoned .then', async () => {
    const promise = new Promise(function () {})
    // eslint-disable-next-line unicorn/no-thenable
    ;(promise as any).then = function () {
      throw new EvalError()
    }
    try {
      await allSettled([promise])
      expect.unreachable('should not reach here')
    } catch (reason: any) {
      expect(reason instanceof EvalError).toBe(true)
    }
  })
})
