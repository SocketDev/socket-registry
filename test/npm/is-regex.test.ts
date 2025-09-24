import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import constants from '../../scripts/constants'
import { isPackageTestingSkipped } from '../../scripts/lib/tests'

const { NPM, testNpmNodeWorkspacesPath } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')
const pkgPath = path.join(testNpmNodeWorkspacesPath, sockRegPkgName)
const pkgRequireIndexJsPath = path.join(pkgPath, 'index.js')
const pkgRequireIndexCjsPath = path.join(pkgPath, 'index.cjs')

// is-regex tests don't account for `is-regex` backed by.
// `require('node:util/types).isRegExp` which triggers no proxy traps and.
// assumes instead that the "getOwnPropertyDescriptor" trap will be triggered.
// by `Object.getOwnPropertyDescriptor(value, 'lastIndex')`.
// https://github.com/inspect-js/is-regex/issues/35
// https://github.com/inspect-js/is-regex/blob/v1.1.4/test/index.js
describe(
  `${eco} > ${sockRegPkgName}`,
  {
    skip:
      isPackageTestingSkipped(eco, sockRegPkgName) ||
      // Add check to avoid errors in CI.
      (constants.ENV.CI &&
        !(
          existsSync(pkgRequireIndexJsPath) &&
          existsSync(pkgRequireIndexCjsPath)
        )),
  },
  () => {
    const implementations = [
      require(pkgRequireIndexJsPath),
      require(pkgRequireIndexCjsPath),
    ]
    for (const isRegex of implementations) {
      it('not regexes', () => {
        expect(isRegex()).toBe(false)
        expect(isRegex(null)).toBe(false)
        expect(isRegex(false)).toBe(false)
        expect(isRegex(true)).toBe(false)
        expect(isRegex(42)).toBe(false)
        expect(isRegex('foo')).toBe(false)
        expect(isRegex([])).toBe(false)
        expect(isRegex({})).toBe(false)
        expect(isRegex(function () {})).toBe(false)
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
          [Symbol.toStringTag]: 'RegExp',
        }

        expect(isRegex(fakeRegex)).toBe(false)
      })

      it('regexes', () => {
        expect(isRegex(/a/g)).toBe(true)
        expect(isRegex(new RegExp('a', 'g'))).toBe(true)
      })

      it('does not mutate regexes', () => {
        // Test lastIndex is a marker object.
        {
          const regex = /a/
          const marker = {}
          ;(regex as any).lastIndex = marker
          expect(regex.lastIndex).toBe(marker)
          expect(isRegex(regex)).toBe(true)
          expect(regex.lastIndex).toBe(marker)
        }

        // Test lastIndex is nonzero.
        {
          const regex = /a/
          regex.lastIndex = 3
          expect(regex.lastIndex).toBe(3)
          expect(isRegex(regex)).toBe(true)
          expect(regex.lastIndex).toBe(3)
        }
      })

      it('does not perform operations observable to Proxies', () => {
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
          'setPrototypeOf',
        ]) {
          ;(Handler.prototype as any)[trapName] = function () {
            this.trapCalls.push(trapName)
            return (Reflect as any)[trapName].apply(Reflect, arguments)
          }
        }

        // Test proxy of object.
        {
          const target = { lastIndex: 0 }
          const handler = new Handler()
          const proxy = new Proxy(
            { lastIndex: 0 },
            handler as ProxyHandler<typeof target>,
          )

          expect(isRegex(proxy)).toBe(false)
          // Support `isRegex` backed by `require('node:util/types').isRegExp`.
          // which triggers no proxy traps.
          // https://github.com/inspect-js/is-regex/issues/35
          expect(handler.trapCalls).toEqual(
            handler.trapCalls.length ? ['getOwnPropertyDescriptor'] : [],
          )
        }

        // Test proxy of RegExp instance.
        {
          const target = /a/
          const handler = new Handler()
          const proxy = new Proxy(/a/, handler as ProxyHandler<typeof target>)

          expect(isRegex(proxy)).toBe(false)
          // Support `isRegex` backed by `require('node:util/types').isRegExp`.
          // which triggers no proxy traps.
          // https://github.com/inspect-js/is-regex/issues/35
          expect(handler.trapCalls).toEqual(
            handler.trapCalls.length ? ['getOwnPropertyDescriptor'] : [],
          )
        }
      })
    }
  },
)
