import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const regPkgName = 'es6-object-assign'
const es6oa: any = require(regPkgName)

// Has no unit tests.
// https://github.com/rubennorte/es6-object-assign/tree/v1.1.0
// Taking tests from https://github.com/ljharb/object.assign/tree/v4.1.5/test
describe(`npm > ${regPkgName}`, () => {
  it('does not have "pending exception" logic in implementation', () => {
    /*
     * Firefox 37 still has "pending exception" logic in its Object.assign implementation,
     * which is 72% slower than our shim, and Firefox 40's native implementation.
     */
    const thrower = Object.preventExtensions({ 1: '2' })
    assert.throws(() => {
      es6oa.assign(thrower, 'xy')
    }, TypeError)
    assert.strictEqual(thrower[1], '2', 'thrower[1] === "2"')
  })

  it('error cases', () => {
    assert.throws(
      () => {
        es6oa.assign(null)
      },
      TypeError,
      'target must be an object'
    )
    assert.throws(
      () => {
        es6oa.assign(undefined)
      },
      TypeError,
      'target must be an object'
    )
    assert.throws(
      () => {
        es6oa.assign(null, {})
      },
      TypeError,
      'target must be an object'
    )
    assert.throws(
      () => {
        es6oa.assign(undefined, {})
      },
      TypeError,
      'target must be an object'
    )
  })

  it('non-object target, no sources', () => {
    const bool = es6oa.assign(true)
    assert.strictEqual(typeof bool, 'object', 'bool is object')
    assert.strictEqual(
      Boolean.prototype.valueOf.call(bool),
      true,
      'bool coerces to `true`'
    )

    const number = es6oa.assign(1)
    assert.strictEqual(typeof number, 'object', 'number is object')
    assert.strictEqual(
      Number.prototype.valueOf.call(number),
      1,
      'number coerces to `1`'
    )

    const string = es6oa.assign('1')
    assert.strictEqual(typeof string, 'object', 'number is object')
    assert.strictEqual(
      String.prototype.valueOf.call(string),
      '1',
      'number coerces to `"1"`'
    )
  })

  it('non-object target, with sources', async t => {
    const signal = {}

    await t.test('boolean', () => {
      const bool = es6oa.assign(true, { a: signal })
      assert.strictEqual(typeof bool, 'object', 'bool is object')
      assert.strictEqual(
        Boolean.prototype.valueOf.call(bool),
        true,
        'bool coerces to `true`'
      )
      assert.strictEqual(bool.a, signal, 'source properties copied')
    })

    await t.test('number', () => {
      const number = es6oa.assign(1, { a: signal })
      assert.strictEqual(typeof number, 'object', 'number is object')
      assert.strictEqual(
        Number.prototype.valueOf.call(number),
        1,
        'number coerces to `1`'
      )
      assert.strictEqual(number.a, signal, 'source properties copied')
    })

    await t.test('string', () => {
      const string = es6oa.assign('1', { a: signal })
      assert.strictEqual(typeof string, 'object', 'number is object')
      assert.strictEqual(
        String.prototype.valueOf.call(string),
        '1',
        'number coerces to `"1"`'
      )
      assert.strictEqual(string.a, signal, 'source properties copied')
    })
  })

  it('non-object sources', () => {
    assert.deepStrictEqual(
      es6oa.assign({ a: 1 }, null, { b: 2 }),
      { a: 1, b: 2 },
      'ignores null source'
    )
    assert.deepStrictEqual(
      es6oa.assign({ a: 1 }, { b: 2 }, undefined),
      { a: 1, b: 2 },
      'ignores undefined source'
    )
  })

  it('returns the modified target object', () => {
    const target = {}
    const returned = es6oa.assign(target, { a: 1 })
    assert.strictEqual(
      returned,
      target,
      'returned object is the same reference as the target object'
    )
  })

  it('has the right name', () => {
    assert.strictEqual(es6oa.assign.name, 'assign')
  })

  it('has the right length', () => {
    assert.strictEqual(es6oa.assign.length, 2)
  })

  it('merge two objects', () => {
    const target = { a: 1 }
    const returned = es6oa.assign(target, { b: 2 })
    assert.deepStrictEqual(
      returned,
      { a: 1, b: 2 },
      'returned object has properties from both'
    )
  })

  it('works with functions', () => {
    const target = () => {}
    ;(target as any).a = 1
    const returned = es6oa.assign(target, { b: 2 })
    assert.strictEqual(target, returned, 'returned object is target')
    assert.strictEqual(returned.a, 1)
    assert.strictEqual(returned.b, 2)
  })

  it('works with primitives', () => {
    const target = 2
    const source = { b: 42 }
    const returned = es6oa.assign(target, source)
    assert.strictEqual(
      Object.prototype.toString.call(returned),
      '[object Number]',
      'returned is object form of number primitive'
    )
    assert.strictEqual(
      Number(returned),
      target,
      'returned and target have same valueOf'
    )
    assert.strictEqual(returned.b, source.b)
  })

  it('merge N objects', () => {
    const target = { a: 1 }
    const source1 = { b: 2 }
    const source2 = { c: 3 }
    const returned = es6oa.assign(target, source1, source2)
    assert.deepStrictEqual(
      returned,
      { a: 1, b: 2, c: 3 },
      'returned object has properties from all sources'
    )
  })

  it('only iterates over own keys', () => {
    class Foo {}
    ;(Foo.prototype as any).bar = true
    const foo = new Foo()
    ;(foo as any).baz = true
    const target = { a: 1 }
    const returned = es6oa.assign(target, foo)
    assert.strictEqual(
      returned,
      target,
      'returned object is the same reference as the target object'
    )
    assert.deepStrictEqual(
      target,
      { a: 1, baz: true },
      'returned object has only own properties from both'
    )
  })

  it('includes enumerable symbols, after keys', () => {
    const visited: PropertyKey[] = []
    const obj = {}
    Object.defineProperty(obj, 'a', {
      enumerable: true,
      get() {
        visited.push('a')
        return 42
      }
    })
    const symbol = Symbol('enumerable')
    Object.defineProperty(obj, symbol, {
      enumerable: true,
      get() {
        visited.push(symbol)
        return Infinity
      }
    })
    const nonEnumSymbol = Symbol('non-enumerable')
    Object.defineProperty(obj, nonEnumSymbol, {
      enumerable: false,
      get() {
        visited.push(nonEnumSymbol)
        return -Infinity
      }
    })
    const target = es6oa.assign({}, obj)
    assert.deepStrictEqual(
      visited,
      ['a', symbol],
      'key is visited first, then symbol'
    )
    assert.strictEqual(target.a, 42, 'targeassert.a is 42')
    assert.strictEqual(target[symbol], Infinity, 'target[symbol] is Infinity')
    assert.notEqual(
      target[nonEnumSymbol],
      -Infinity,
      'target[nonEnumSymbol] is not -Infinity'
    )
  })

  it('does not fail when symbols are not present', () => {
    const visited: PropertyKey[] = []
    const obj = {}
    Object.defineProperty(obj, 'a', {
      enumerable: true,
      get() {
        visited.push('a')
        return 42
      }
    })
    const keys: PropertyKey[] = ['a']
    const symbol = Symbol('sym')
    Object.defineProperty(obj, symbol, {
      enumerable: true,
      get() {
        visited.push(symbol)
        return Infinity
      }
    })
    keys.push(symbol)
    const target = es6oa.assign({}, obj)
    assert.deepStrictEqual(visited, keys, 'Object.assign visits expected keys')
    assert.strictEqual(target.a, 42, 'target.a is 42')
    assert.strictEqual(target[symbol], Infinity)
  })

  it('preserves correct property enumeration order', () => {
    /*
     * v8, specifically in node 4.x, has a bug with incorrect property enumeration order
     * note: this does not detect the bug unless there's 20 characters
     */
    const str = 'abcdefghijklmnopqrst'
    const letters = {}
    for (const letter of str.split('')) {
      ;(letters as any)[letter] = letter
    }
    const n = 5
    console.log(`run the next test ${n} times`)
    const object = es6oa.assign({}, letters)
    let actual = ''
    for (const k in object) {
      actual += k
    }
    for (let i = 0; i < n; i += 1) {
      assert.strictEqual(
        actual,
        str,
        'property enumeration order should be followed'
      )
    }
  })

  it('checks enumerability and existence, in case of modification during [[Get]]', () => {
    const targetBValue = {}
    const targetCValue = {}
    const target = { b: targetBValue, c: targetCValue }
    const source = {}
    Object.defineProperty(source, 'a', {
      enumerable: true,
      get() {
        delete this.b
        Object.defineProperty(this, 'c', { enumerable: false })
        return 'a'
      }
    })
    const sourceBValue = {}
    const sourceCValue = {}
    ;(source as any).b = sourceBValue
    ;(source as any).c = sourceCValue
    var result = es6oa.assign(target, source)
    assert.strictEqual(result, target, 'sanity check: result is === target')
    assert.strictEqual(
      result.b,
      targetBValue,
      'target key not overwritten by deleted source key'
    )
    assert.strictEqual(
      result.c,
      targetCValue,
      'target key not overwritten by non-enumerable source key'
    )
  })
})
