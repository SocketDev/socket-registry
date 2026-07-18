/**
 * @file Deep-comparison, throwing, and edge-case tests for the assert package
 *   override — deepEqual/notDeepEqual/deepStrictEqual/notDeepStrictEqual,
 *   throws/doesNotThrow/ifError/fail/match/doesNotMatch, and edge cases. The
 *   basic assertion methods (AssertionError, ok, equal, strictEqual, …) live in
 *   assert.test.mts; both bind to the `assert` override. Tests ported from
 *   https://github.com/browserify/commonjs-assert/blob/c628adcf35900c423ae2c14914eab133cfe9f2ad/test/parallel/test-assert.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: assert,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url, { package: 'assert' })

// assert package tests use old util.isError which was deprecated and removed
// in Node.js 20+.
// https://nodejs.org/docs/latest-v18.x/api/util.html#deprecated-apis
describe(`${eco} > ${sockRegPkgName} > deep`, { skip }, () => {
  describe('deepEqual', () => {
    it('should pass for deeply equal objects', () => {
      expect(() => assert.deepEqual({ a: 1 }, { a: 1 })).not.toThrow()
      expect(() => assert.deepEqual([1, 2, 3], [1, 2, 3])).not.toThrow()
      expect(() => assert.deepEqual({ a: [1, 2] }, { a: [1, 2] })).not.toThrow()
    })

    it('should pass for loosely equal primitives', () => {
      expect(() => assert.deepEqual(1, '1')).not.toThrow()
      expect(() => assert.deepEqual(true, 1)).not.toThrow()
    })

    it('should throw for deeply inequal objects', () => {
      expect(() => assert.deepEqual({ a: 1 }, { a: 2 })).toThrow(
        assert.AssertionError,
      )
      expect(() => assert.deepEqual([1, 2, 3], [1, 2, 4])).toThrow(
        assert.AssertionError,
      )
      expect(() => assert.deepEqual({ a: 1 }, { b: 1 })).toThrow(
        assert.AssertionError,
      )
    })

    it('should handle null and undefined', () => {
      expect(() => assert.deepEqual(undefined, undefined)).not.toThrow()
      expect(() => assert.deepEqual(undefined, undefined)).not.toThrow()
      expect(() => assert.deepEqual(undefined, undefined)).not.toThrow()
    })

    it('should handle arrays', () => {
      expect(() => assert.deepEqual([], [])).not.toThrow()
      expect(() => assert.deepEqual([1], [1])).not.toThrow()
      expect(() => assert.deepEqual([1, 2, 3], [1, 2, 3])).not.toThrow()
      expect(() => assert.deepEqual([1], [2])).toThrow(assert.AssertionError)
      expect(() => assert.deepEqual([1, 2], [1])).toThrow(assert.AssertionError)
    })

    it('should handle nested objects', () => {
      expect(() =>
        assert.deepEqual({ a: { b: 1 } }, { a: { b: 1 } }),
      ).not.toThrow()
      expect(() => assert.deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toThrow(
        assert.AssertionError,
      )
    })

    it('should handle dates', () => {
      const date1 = new Date('2000-01-01')
      const date2 = new Date('2000-01-01')
      const date3 = new Date('2000-01-02')
      expect(() => assert.deepEqual(date1, date2)).not.toThrow()
      expect(() => assert.deepEqual(date1, date3)).toThrow(
        assert.AssertionError,
      )
    })

    it('should handle regexes', () => {
      expect(() => assert.deepEqual(/abc/, /abc/)).not.toThrow()
      expect(() => assert.deepEqual(/abc/i, /abc/i)).not.toThrow()
      expect(() => assert.deepEqual(/abc/, /abc/i)).toThrow(
        assert.AssertionError,
      )
      expect(() => assert.deepEqual(/abc/, /def/)).toThrow(
        assert.AssertionError,
      )
    })

    it('should handle buffers', () => {
      if (typeof Buffer !== 'function') {
        return
      }

      const buf1 = Buffer.from('test')
      const buf2 = Buffer.from('test')
      const buf3 = Buffer.from('tset')
      expect(() => assert.deepEqual(buf1, buf2)).not.toThrow()
      expect(() => assert.deepEqual(buf1, buf3)).toThrow(assert.AssertionError)
    })
  })

  describe('notDeepEqual', () => {
    it('should pass for deeply inequal objects', () => {
      expect(() => assert.notDeepEqual({ a: 1 }, { a: 2 })).not.toThrow()
      expect(() => assert.notDeepEqual([1, 2, 3], [1, 2, 4])).not.toThrow()
      expect(() => assert.notDeepEqual({ a: 1 }, { b: 1 })).not.toThrow()
    })

    it('should throw for deeply equal objects', () => {
      expect(() => assert.notDeepEqual({ a: 1 }, { a: 1 })).toThrow(
        assert.AssertionError,
      )
      expect(() => assert.notDeepEqual([1, 2, 3], [1, 2, 3])).toThrow(
        assert.AssertionError,
      )
    })
  })

  describe('deepStrictEqual', () => {
    it('should pass for deeply and strictly equal objects', () => {
      expect(() => assert.deepStrictEqual({ a: 1 }, { a: 1 })).not.toThrow()
      expect(() => assert.deepStrictEqual([1, 2, 3], [1, 2, 3])).not.toThrow()
    })

    it('should throw for loosely equal but strictly inequal objects', () => {
      expect(() => assert.deepStrictEqual({ a: 1 }, { a: '1' })).toThrow(
        assert.AssertionError,
      )
      expect(() => assert.deepStrictEqual([1], ['1'])).toThrow(
        assert.AssertionError,
      )
    })

    it('should throw for null and undefined', () => {
      expect(() => assert.deepStrictEqual(null, undefined)).toThrow(
        assert.AssertionError,
      )
    })

    it('should handle primitives', () => {
      expect(() => assert.deepStrictEqual(1, 1)).not.toThrow()
      expect(() => assert.deepStrictEqual('test', 'test')).not.toThrow()
      expect(() => assert.deepStrictEqual(true, true)).not.toThrow()
      expect(() => assert.deepStrictEqual(1, '1')).toThrow(
        assert.AssertionError,
      )
    })
  })

  describe('notDeepStrictEqual', () => {
    it('should pass for deeply strict inequal objects', () => {
      expect(() =>
        assert.notDeepStrictEqual({ a: 1 }, { a: '1' }),
      ).not.toThrow()
      expect(() => assert.notDeepStrictEqual([1], ['1'])).not.toThrow()
    })

    it('should throw for deeply strict equal objects', () => {
      expect(() => assert.notDeepStrictEqual({ a: 1 }, { a: 1 })).toThrow(
        assert.AssertionError,
      )
      expect(() => assert.notDeepStrictEqual([1, 2], [1, 2])).toThrow(
        assert.AssertionError,
      )
    })
  })

  describe('throws', () => {
    it('should pass when function throws', () => {
      expect(() =>
        assert.throws(() => {
          throw new Error('test')
        }),
      ).not.toThrow()
    })

    it('should throw when function does not throw', () => {
      expect(() =>
        assert.throws(() => {
          // Does not throw
        }),
      ).toThrow(assert.AssertionError)
    })

    it('should validate error type', () => {
      expect(() =>
        assert.throws(() => {
          throw new TypeError('test')
        }, TypeError),
      ).not.toThrow()

      expect(() =>
        assert.throws(() => {
          throw new TypeError('test')
        }, RangeError),
      ).toThrow(assert.AssertionError)
    })

    it('should validate error message with regex', () => {
      expect(() =>
        assert.throws(() => {
          throw new Error('test message')
        }, /test/),
      ).not.toThrow()

      expect(() =>
        assert.throws(() => {
          throw new Error('test message')
        }, /other/),
      ).toThrow(assert.AssertionError)
    })

    it('should validate error message with regexp', () => {
      // A string second argument is the AMBIGUOUS_ARGUMENT message form; the
      // way to match an error message is a RegExp.
      expect(() =>
        assert.throws(() => {
          throw new Error('test message')
        }, /test message/),
      ).not.toThrow()
    })

    it('should validate error with function', () => {
      expect(() =>
        assert.throws(
          () => {
            throw new Error('test')
          },
          (err: unknown) => err instanceof Error,
        ),
      ).not.toThrow()
    })
  })

  describe('doesNotThrow', () => {
    it('should pass when function does not throw', () => {
      expect(() =>
        assert.doesNotThrow(() => {
          // Does not throw
        }),
      ).not.toThrow()
    })

    it('should throw when function throws', () => {
      expect(() =>
        assert.doesNotThrow(() => {
          throw new Error('test')
        }),
      ).toThrow()
    })

    it('rethrows when the thrown error does not match the filter', () => {
      // doesNotThrow only swallows errors matching the filter; a non-matching
      // error propagates to the caller.
      expect(() =>
        assert.doesNotThrow(() => {
          throw new TypeError('test')
        }, RangeError),
      ).toThrow(TypeError)
    })
  })

  describe('ifError', () => {
    it('does not throw for null or undefined', () => {
      if (assert.ifError) {
        expect(() => assert.ifError(undefined)).not.toThrow()
        expect(() => assert.ifError(undefined)).not.toThrow()
      }
    })

    it('throws for any other value, including falsy ones', () => {
      if (assert.ifError) {
        expect(() => assert.ifError(false)).toThrow(assert.AssertionError)
        expect(() => assert.ifError(0)).toThrow(assert.AssertionError)
        expect(() => assert.ifError('')).toThrow(assert.AssertionError)
      }
    })

    it('should throw for truthy values', () => {
      if (assert.ifError) {
        expect(() => assert.ifError(new Error('test'))).toThrow()
        expect(() => assert.ifError('error')).toThrow()
        expect(() => assert.ifError(1)).toThrow()
      }
    })
  })

  describe('fail', () => {
    it('should always throw', () => {
      if (assert.fail) {
        expect(() => assert.fail()).toThrow(assert.AssertionError)
        expect(() => assert.fail('test message')).toThrow(assert.AssertionError)
      }
    })

    it('should use custom message', () => {
      if (assert.fail) {
        try {
          assert.fail('custom message')
        } catch (e) {
          expect((e as Error).message).toContain('custom')
        }
      }
    })
  })

  describe('match', () => {
    it('should pass for matching string and regex', () => {
      if (assert.match) {
        expect(() => assert.match('test string', /test/)).not.toThrow()
        expect(() => assert.match('hello world', /world/)).not.toThrow()
      }
    })

    it('should throw for non-matching string and regex', () => {
      if (assert.match) {
        expect(() => assert.match('test string', /other/)).toThrow(
          assert.AssertionError,
        )
      }
    })
  })

  describe('doesNotMatch', () => {
    it('should pass for non-matching string and regex', () => {
      if (assert.doesNotMatch) {
        expect(() => assert.doesNotMatch('test string', /other/)).not.toThrow()
        expect(() => assert.doesNotMatch('hello', /world/)).not.toThrow()
      }
    })

    it('should throw for matching string and regex', () => {
      if (assert.doesNotMatch) {
        expect(() => assert.doesNotMatch('test string', /test/)).toThrow(
          assert.AssertionError,
        )
      }
    })
  })

  describe('edge cases', () => {
    it('should handle NaN', () => {
      expect(() => assert.deepStrictEqual(Number.NaN, Number.NaN)).not.toThrow()
      // strictEqual uses Object.is, so NaN is equal to NaN.
      expect(() => assert.strictEqual(Number.NaN, Number.NaN)).not.toThrow()
    })

    it('should handle +0 and -0', () => {
      // strictEqual / deepStrictEqual use Object.is, which separates signed zero.
      expect(() => assert.strictEqual(+0, -0)).toThrow(assert.AssertionError)
      expect(() => assert.deepStrictEqual(+0, -0)).toThrow(
        assert.AssertionError,
      )
    })

    it('should handle symbols', () => {
      if (typeof Symbol !== 'undefined') {
        const sym1 = Symbol('test')
        const sym2 = Symbol('test')
        expect(() => assert.strictEqual(sym1, sym1)).not.toThrow()
        expect(() => assert.strictEqual(sym1, sym2)).toThrow(
          assert.AssertionError,
        )
      }
    })

    it('should handle circular references', () => {
      const obj1: { a: number; self?: unknown | undefined } = { a: 1 }
      obj1.self = obj1
      const obj2: { a: number; self?: unknown | undefined } = { a: 1 }
      obj2.self = obj2
      expect(() => assert.deepEqual(obj1, obj2)).not.toThrow()
    })

    it('should handle sparse arrays', () => {
      const arr1 = [1, undefined, 3]
      const arr2 = [1, undefined, 3]
      expect(() => assert.deepEqual(arr1, arr2)).not.toThrow()
    })

    it('should handle boxed primitives', () => {
      expect(() => assert.deepEqual(new Number(1), new Number(1))).not.toThrow()
      expect(() =>
        assert.deepEqual(new String('test'), new String('test')),
      ).not.toThrow()
      expect(() =>
        assert.deepEqual(new Boolean(true), new Boolean(true)),
      ).not.toThrow()
    })

    it('should handle errors with custom properties', () => {
      const err1 = new Error('test') as Error & { code?: string | undefined }
      err1.code = 'ERR_TEST'
      const err2 = new Error('test') as Error & { code?: string | undefined }
      err2.code = 'ERR_TEST'
      expect(() => assert.deepEqual(err1, err2)).not.toThrow()
    })
  })
})
