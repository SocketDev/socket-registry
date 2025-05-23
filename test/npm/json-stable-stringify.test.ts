import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const { NPM, testNpmNodeWorkspacesPath } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')
const pkgPath = path.join(testNpmNodeWorkspacesPath, sockRegPkgName)
const pkgRequireIndexJsPath = path.join(pkgPath, 'index.js')

describe(
  `${eco} > ${sockRegPkgName}`,
  {
    skip:
      isPackageTestingSkipped(eco, sockRegPkgName) ||
      // Add check to avoid errors in CI.
      // Lazily access constants.ENV.
      (constants.ENV.CI && !existsSync(pkgRequireIndexJsPath))
  },
  () => {
    const jsonStableStringify = require(pkgRequireIndexJsPath)

    const rawJSON: ((_str: string) => { rawJSON: string }) | undefined = (
      JSON as any
    ).rawJSON

    const SUPPORTS_JSON_RAW_JSON = typeof rawJSON === 'function'

    for (const methodName of [
      'stableStringifyRecursive',
      'stableStringifyNonRecursive'
    ]) {
      it(`${methodName}: space parameter (nested objects)`, () => {
        const obj = { one: 1, two: { b: 4, a: [2, 3] } }
        assert.equal(
          jsonStableStringify(obj, { space: '  ' }),
          '' +
            '{\n' +
            '  "one": 1,\n' +
            '  "two": {\n' +
            '    "a": [\n' +
            '      2,\n' +
            '      3\n' +
            '    ],\n' +
            '    "b": 4\n' +
            '  }\n' +
            '}'
        )
      })

      it(`${methodName}: space parameter (same as native)`, () => {
        // for this test, properties need to be in alphabetical order
        const obj = { one: 1, two: { a: [2, 3], b: 4 } }
        assert.equal(
          jsonStableStringify(obj, { space: '  ' }),
          JSON.stringify(obj, null, '  ')
        )
      })

      it(`${methodName}: space parameter base empty behavior: empty arrays and objects have added newline and space`, () => {
        const obj = { emptyArr: [], emptyObj: {} }
        assert.equal(
          jsonStableStringify(obj, { space: '  ' }),
          '{\n  "emptyArr": [\n  ],\n  "emptyObj": {\n  }\n}'
        )
      })

      it(`${methodName}: space parameter, with collapseEmpty: true`, () => {
        const obj = { emptyArr: [], emptyObj: {} }
        assert.throws(function () {
          jsonStableStringify(obj, { collapseEmpty: 'not a boolean' })
        }, TypeError)
        assert.equal(
          jsonStableStringify(obj, { collapseEmpty: true, space: '  ' }),
          '{\n  "emptyArr": [],\n  "emptyObj": {}\n}'
        )
      })

      it(
        `${methodName}: supports JSON.rawJSON`,
        { skip: !SUPPORTS_JSON_RAW_JSON },
        () => {
          // Test case from MDN example:
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/isRawJSON#examples.
          assert.strictEqual(
            jsonStableStringify({
              name: 'Josh',
              userId: rawJSON!('12345678901234567890'),
              friends: [
                { name: 'Alice', userId: rawJSON!('9876543210987654321') },
                { name: 'Bob', userId: rawJSON!('56789012345678901234') }
              ]
            }),
            '{"friends":[{"name":"Alice","userId":9876543210987654321},{"name":"Bob","userId":56789012345678901234}],"name":"Josh","userId":12345678901234567890}'
          )
        }
      )

      // This test must be last because it triggers the internal switch from
      // stableStringifyRecursive to stableStringifyNonRecursive.
      it(`${methodName}: can handle exceeding call stack limits`, () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        function createCallStackBusterObject() {
          let obj = {}
          let limit = 0
          const result = obj
          try {
            ;(function r() {
              limit += 1
              const newObj = {}
              ;(obj as any)[`prop${limit}`] = newObj
              obj = newObj
              r()
            })()
          } catch {}
          return result
        }
        assert.doesNotThrow(() =>
          jsonStableStringify(createCallStackBusterObject())
        )
      })
    }
  }
)
