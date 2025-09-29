import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants.mjs'
import { installPackageForTesting } from '../../scripts/utils/package-utils.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

describe(
  `${eco} > ${sockRegPkgName}`,
  {
    skip: isPackageTestingSkipped(eco, sockRegPkgName) || constants.ENV.CI,
  },
  () => {
    let pkgPath: string
    let pkgRequireIndexJsPath: string
    let jsonStableStringify: any

    beforeAll(async () => {
      const result = await installPackageForTesting(sockRegPkgName)
      if (!result.installed) {
        // Skip tests if package installation is skipped for known issues
        if (result.reason === 'Skipped (known issues)') {
          return
        }
        throw new Error(`Failed to install package: ${result.reason}`)
      }
      pkgPath = result.packagePath!
      pkgRequireIndexJsPath = path.join(pkgPath, 'index.js')
      jsonStableStringify = require(pkgRequireIndexJsPath)
    })

    const rawJSON: ((_str: string) => { rawJSON: string }) | undefined = (
      JSON as any
    ).rawJSON

    const SUPPORTS_JSON_RAW_JSON = typeof rawJSON === 'function'

    for (const methodName of [
      'stableStringifyRecursive',
      'stableStringifyNonRecursive',
    ]) {
      it(`${methodName}: space parameter (nested objects)`, () => {
        const obj = { one: 1, two: { b: 4, a: [2, 3] } }
        expect(jsonStableStringify(obj, { space: '  ' })).toBe(
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
            '}',
        )
      })

      it(`${methodName}: space parameter (same as native)`, () => {
        // For this test, properties need to be in alphabetical order.
        const obj = { one: 1, two: { a: [2, 3], b: 4 } }
        expect(jsonStableStringify(obj, { space: '  ' })).toBe(
          JSON.stringify(obj, null, '  '),
        )
      })

      it(`${methodName}: space parameter base empty behavior: empty arrays and objects have added newline and space`, () => {
        const obj = { emptyArr: [], emptyObj: {} }
        expect(jsonStableStringify(obj, { space: '  ' })).toBe(
          '{\n  "emptyArr": [\n  ],\n  "emptyObj": {\n  }\n}',
        )
      })

      it(`${methodName}: space parameter, with collapseEmpty: true`, () => {
        const obj = { emptyArr: [], emptyObj: {} }
        expect(function () {
          jsonStableStringify(obj, { collapseEmpty: 'not a boolean' })
        }).toThrow(TypeError)
        expect(
          jsonStableStringify(obj, { collapseEmpty: true, space: '  ' }),
        ).toBe('{\n  "emptyArr": [],\n  "emptyObj": {}\n}')
      })

      it(
        `${methodName}: supports JSON.rawJSON`,
        { skip: !SUPPORTS_JSON_RAW_JSON || !jsonStableStringify },
        () => {
          // Test case from MDN example:
          // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/isRawJSON#examples
          expect(
            jsonStableStringify({
              name: 'Josh',
              userId: rawJSON!('12345678901234567890'),
              friends: [
                { name: 'Alice', userId: rawJSON!('9876543210987654321') },
                { name: 'Bob', userId: rawJSON!('56789012345678901234') },
              ],
            }),
          ).toBe(
            '{"friends":[{"name":"Alice","userId":9876543210987654321},{"name":"Bob","userId":56789012345678901234}],"name":"Josh","userId":12345678901234567890}',
          )
        },
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
        expect(() =>
          jsonStableStringify(createCallStackBusterObject()),
        ).not.toThrow()
      })
    }
  },
)
