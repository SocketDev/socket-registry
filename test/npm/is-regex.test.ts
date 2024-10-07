import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const regPkgName = 'is-regex'
const isRegex: any = require(regPkgName)

// is-regex tests don't account for `is-regex` backed by
// `require('node:util/types).isRegExp` which triggers no proxy traps and
// assumes instead that the "getOwnPropertyDescriptor" trap will be triggered
// by `Object.getOwnPropertyDescriptor(value, 'lastIndex')`.
// https://github.com/inspect-js/is-regex/issues/35
// https://github.com/inspect-js/is-regex/blob/v1.1.4/test/index.js
describe(`npm > ${regPkgName}`, async () => {
  it('not regexes', () => {
    assert.strictEqual(isRegex(), false, 'undefined is not regex')
    assert.strictEqual(isRegex(null), false, 'null is not regex')
    assert.strictEqual(isRegex(false), false, 'false is not regex')
    assert.strictEqual(isRegex(true), false, 'true is not regex')
    assert.strictEqual(isRegex(42), false, 'number is not regex')
    assert.strictEqual(isRegex('foo'), false, 'string is not regex')
    assert.strictEqual(isRegex([]), false, 'array is not regex')
    assert.strictEqual(isRegex({}), false, 'object is not regex')
    assert.strictEqual(
      isRegex(function () {}),
      false,
      'function is not regex'
    )
  })

  it('@@toStringTag', () => {
    const regex = /a/g
    const fakeRegex = {
      toString() {
        return String(regex)
      },
      valueOf() {
        return regex
      },
      [Symbol.toStringTag]: 'RegExp'
    }

    assert.strictEqual(
      isRegex(fakeRegex),
      false,
      'fake RegExp with @@toStringTag "RegExp" is not regex'
    )
  })

  it('regexes', () => {
    assert.ok(isRegex(/a/g), 'regex literal is regex')
    assert.ok(isRegex(new RegExp('a', 'g')), 'regex object is regex')
  })

  it('does not mutate regexes', async t => {
    await t.test('lastIndex is a marker object', () => {
      const regex = /a/
      const marker = {}
      ;(regex as any).lastIndex = marker
      assert.strictEqual(
        regex.lastIndex,
        marker,
        'lastIndex is the marker object'
      )
      assert.ok(isRegex(regex), 'is regex')
      assert.strictEqual(
        regex.lastIndex,
        marker,
        'lastIndex is the marker object after isRegex'
      )
    })

    await t.test('lastIndex is nonzero', () => {
      const regex = /a/
      regex.lastIndex = 3
      assert.equal(regex.lastIndex, 3, 'lastIndex is 3')
      assert.ok(isRegex(regex), 'is regex')
      assert.equal(regex.lastIndex, 3, 'lastIndex is 3 after isRegex')
    })
  })

  it('does not perform operations observable to Proxies', async t => {
    class Handler {
      trapCalls: string[]
      constructor() {
        this.trapCalls = []
      }
    }

    for (const trapName of [
      'defineProperty',
      'deleteProperty',
      'get',
      'getOwnPropertyDescriptor',
      'getPrototypeOf',
      'has',
      'isExtensible',
      'ownKeys',
      'preventExtensions',
      'set',
      'setPrototypeOf'
    ]) {
      ;(Handler.prototype as any)[trapName] = function () {
        this.trapCalls.push(trapName)
        return (Reflect as any)[trapName].apply(Reflect, arguments)
      }
    }

    await t.test('proxy of object', () => {
      const target = { lastIndex: 0 }
      const handler = new Handler()
      const proxy = new Proxy(
        { lastIndex: 0 },
        <ProxyHandler<typeof target>>handler
      )

      assert.strictEqual(
        isRegex(proxy),
        false,
        'proxy of plain object is not regex'
      )
      // Support `isRegex` backed by `require('node:util/types').isRegExp`
      // which triggers no proxy traps.
      // https://github.com/inspect-js/is-regex/issues/35
      assert.deepStrictEqual(
        handler.trapCalls,
        handler.trapCalls.length ? ['getOwnPropertyDescriptor'] : [],
        'no unexpected proxy traps were triggered'
      )
    })

    await t.test('proxy of RegExp instance', () => {
      const target = /a/
      const handler = new Handler()
      const proxy = new Proxy(/a/, <ProxyHandler<typeof target>>handler)

      assert.strictEqual(
        isRegex(proxy),
        false,
        'proxy of RegExp instance is not regex'
      )
      // Support `isRegex` backed by `require('node:util/types').isRegExp`
      // which triggers no proxy traps.
      // https://github.com/inspect-js/is-regex/issues/35
      assert.deepStrictEqual(
        handler.trapCalls,
        handler.trapCalls.length ? ['getOwnPropertyDescriptor'] : [],
        'no unexpected proxy traps were triggered'
      )
    })
  })
})
