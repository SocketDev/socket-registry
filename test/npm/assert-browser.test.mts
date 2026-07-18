/**
 * @file Parity tests for the assert override's portable (non-node) export
 *   branch — packages/npm/assert/package/build/assert.js. The main suite
 *   (assert.test.mts) loads the override through the `node` export condition,
 *   which resolves to a thin node:assert re-export (index.js). This file loads
 *   package/build/assert.js DIRECTLY so the hand-maintained port — the branch a
 *   bundler/browser receives, which carries the inlined natives + the vendored
 *   browser-safe util shim that replaced the runtime deps — is exercised. Each
 *   case mirrors node:assert behavior the port must preserve.
 */

import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const { eco, pkgPath, skip, sockRegPkgName } = setupNpmPackageTest(
  import.meta.url,
  { package: 'assert' },
)

interface AssertModule {
  (value: unknown, message?: string): void
  AssertionError: new () => Error
  ok: (value: unknown, message?: string) => void
  equal: (actual: unknown, expected: unknown) => void
  strictEqual: (actual: unknown, expected: unknown) => void
  notStrictEqual: (actual: unknown, expected: unknown) => void
  deepEqual: (actual: unknown, expected: unknown) => void
  deepStrictEqual: (actual: unknown, expected: unknown) => void
  throws: (fn: () => void, expected?: unknown) => void
  doesNotThrow: (fn: () => void) => void
  fail: (message?: string) => void
  ifError: (value: unknown) => void
}

function loadPort(): AssertModule {
  if (skip) {
    return (() => {}) as unknown as AssertModule
  }
  return require(path.join(pkgPath, 'package', 'build', 'assert.js'))
}

const assert = loadPort()

function isAssertionError(fn: () => void): boolean {
  try {
    fn()
    return false
  } catch (e) {
    return e instanceof Error && e.name === 'AssertionError'
  }
}

describe(`${eco} > ${sockRegPkgName} (portable branch)`, { skip }, () => {
  it('AssertionError is an Error subclass', () => {
    expect(assert.AssertionError.prototype instanceof Error).toBe(true)
  })

  it('ok / assert: truthy passes, falsy throws AssertionError', () => {
    expect(() => assert.ok(true)).not.toThrow()
    expect(() => assert(1)).not.toThrow()
    expect(isAssertionError(() => assert.ok(false))).toBe(true)
    expect(isAssertionError(() => assert(0))).toBe(true)
  })

  it('equal (loose) vs strictEqual', () => {
    expect(() => assert.equal(1, '1')).not.toThrow()
    expect(isAssertionError(() => assert.strictEqual(1, '1'))).toBe(true)
    expect(() => assert.strictEqual(1, 1)).not.toThrow()
    expect(() => assert.notStrictEqual(1, '1')).not.toThrow()
  })

  it('deepStrictEqual across object / Date / Map / TypedArray', () => {
    expect(() =>
      assert.deepStrictEqual({ a: [1, 2] }, { a: [1, 2] }),
    ).not.toThrow()
    expect(() => assert.deepStrictEqual(new Date(1), new Date(1))).not.toThrow()
    expect(() =>
      assert.deepStrictEqual(new Map([['a', 1]]), new Map([['a', 1]])),
    ).not.toThrow()
    expect(() =>
      assert.deepStrictEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2])),
    ).not.toThrow()
    expect(
      isAssertionError(() => assert.deepStrictEqual({ a: 1 }, { a: 2 })),
    ).toBe(true)
  })

  it('throws / doesNotThrow', () => {
    expect(() =>
      assert.throws(() => {
        throw new TypeError('boom')
      }, TypeError),
    ).not.toThrow()
    expect(isAssertionError(() => assert.throws(() => {}))).toBe(true)
    expect(() => assert.doesNotThrow(() => {})).not.toThrow()
  })

  it('fail / ifError, with a non-empty message', () => {
    let message = ''
    try {
      assert.fail('forced failure')
    } catch (e) {
      message = e instanceof Error ? e.message : ''
    }
    expect(message.length).toBeGreaterThan(0)
    expect(() => assert.ifError(undefined)).not.toThrow()
    expect(isAssertionError(() => assert.ifError(new Error('e')))).toBe(true)
  })
})
