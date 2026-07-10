/**
 * @file Basic assertion-method tests for the assert package override —
 *   AssertionError, ok, equal, notEqual, strictEqual, notStrictEqual. The
 *   deep-comparison, throwing, and edge-case tests live in
 *   assert-deep.test.mts; both bind to the `assert` override. Tests ported from
 *   https://github.com/browserify/commonjs-assert/blob/c628adcf35900c423ae2c14914eab133cfe9f2ad/test/parallel/test-assert.js.
 */

import { describe, expect, it } from 'vitest'

import { expectValidPackageStructure } from '../util/assertion-helpers.mts'
import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: assert,
  pkgPath,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

// assert package tests use old util.isError which was deprecated and removed
// in Node.js 20+.
// https://nodejs.org/docs/latest-v18.x/api/util.html#deprecated-apis
describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should have valid package structure', () => {
    expectValidPackageStructure(pkgPath, assert, 'function')
  })

  describe('AssertionError', () => {
    it('should extend Error', () => {
      expect(assert.AssertionError.prototype instanceof Error).toBe(true)
    })

    it('should have correct properties', () => {
      try {
        assert(false, 'test message')
      } catch (e) {
        expect(e instanceof assert.AssertionError).toBe(true)
        expect(e instanceof Error).toBe(true)
        expect((e as Error).name).toBe('AssertionError')
        expect((e as Error).message).toBeTruthy()
      }
    })
  })

  describe('ok', () => {
    it('should not throw for truthy values', () => {
      expect(() => assert(true)).not.toThrow()
      expect(() => assert.ok(true)).not.toThrow()
      expect(() => assert('test')).not.toThrow()
      expect(() => assert.ok('test')).not.toThrow()
      expect(() => assert(1)).not.toThrow()
      expect(() => assert.ok(1)).not.toThrow()
    })

    it('should throw for falsy values', () => {
      expect(() => assert(false)).toThrow(assert.AssertionError)
      expect(() => assert.ok(false)).toThrow(assert.AssertionError)
      expect(() => assert(0)).toThrow(assert.AssertionError)
      expect(() => assert.ok(0)).toThrow(assert.AssertionError)
      expect(() => assert('')).toThrow(assert.AssertionError)
      expect(() => assert.ok('')).toThrow(assert.AssertionError)
      expect(() => assert(undefined)).toThrow(assert.AssertionError)
      expect(() => assert.ok(undefined)).toThrow(assert.AssertionError)
      expect(() => assert(undefined)).toThrow(assert.AssertionError)
      expect(() => assert.ok(undefined)).toThrow(assert.AssertionError)
    })
  })

  describe('equal', () => {
    it('should pass for equal values', () => {
      expect(() => assert.equal(undefined, undefined)).not.toThrow()
      expect(() => assert.equal(undefined, undefined)).not.toThrow()
      expect(() => assert.equal(undefined, undefined)).not.toThrow()
      expect(() => assert.equal(true, true)).not.toThrow()
      expect(() => assert.equal(2, '2')).not.toThrow()
      expect(() => assert.equal(1, 1)).not.toThrow()
    })

    it('should throw for inequal values', () => {
      expect(() => assert.equal(true, false)).toThrow(assert.AssertionError)
      expect(() => assert.equal(1, 2)).toThrow(assert.AssertionError)
      expect(() => assert.equal('a', 'b')).toThrow(assert.AssertionError)
    })
  })

  describe('notEqual', () => {
    it('should pass for inequal values', () => {
      expect(() => assert.notEqual(true, false)).not.toThrow()
      expect(() => assert.notEqual(1, 2)).not.toThrow()
      expect(() => assert.notEqual('a', 'b')).not.toThrow()
    })

    it('should throw for equal values', () => {
      expect(() => assert.notEqual(true, true)).toThrow(assert.AssertionError)
      expect(() => assert.notEqual(1, 1)).toThrow(assert.AssertionError)
    })
  })

  describe('strictEqual', () => {
    it('should pass for strictly equal values', () => {
      expect(() => assert.strictEqual(undefined, undefined)).not.toThrow()
      expect(() => assert.strictEqual(undefined, undefined)).not.toThrow()
      expect(() => assert.strictEqual(true, true)).not.toThrow()
      expect(() => assert.strictEqual(1, 1)).not.toThrow()
      expect(() => assert.strictEqual('test', 'test')).not.toThrow()
    })

    it('should throw for loosely equal but strictly inequal values', () => {
      expect(() => assert.strictEqual(2, '2')).toThrow(assert.AssertionError)
      expect(() => assert.strictEqual(null, undefined)).toThrow(
        assert.AssertionError,
      )
      expect(() => assert.strictEqual(true, 1)).toThrow(assert.AssertionError)
    })

    it('should throw for inequal values', () => {
      expect(() => assert.strictEqual(1, 2)).toThrow(assert.AssertionError)
      expect(() => assert.strictEqual('a', 'b')).toThrow(assert.AssertionError)
    })
  })

  describe('notStrictEqual', () => {
    it('should pass for strictly inequal values', () => {
      expect(() => assert.notStrictEqual(2, '2')).not.toThrow()
      expect(() => assert.notStrictEqual(null, undefined)).not.toThrow()
      expect(() => assert.notStrictEqual(1, 2)).not.toThrow()
    })

    it('should throw for strictly equal values', () => {
      expect(() => assert.notStrictEqual(2, 2)).toThrow(assert.AssertionError)
      expect(() => assert.notStrictEqual('test', 'test')).toThrow(
        assert.AssertionError,
      )
    })
  })
})
