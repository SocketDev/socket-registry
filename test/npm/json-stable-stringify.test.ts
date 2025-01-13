import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const { NPM, testNpmNodeWorkspacesPath } = constants

const eco = NPM
const regPkgName = path.basename(__filename, '.test.ts')
const pkgPath = path.join(testNpmNodeWorkspacesPath, regPkgName)
const pkgRequireIndexJsPath = path.join(pkgPath, 'index.js')

describe(
  `${eco} > ${regPkgName}`,
  {
    skip:
      isPackageTestingSkipped(eco, regPkgName) ||
      // Add check to avoid errors in CI.
      !existsSync(pkgRequireIndexJsPath)
  },
  () => {
    const jsonStableStringify = require(pkgRequireIndexJsPath)

    const rawJSON: ((_str: string) => { rawJSON: string }) | undefined = (
      JSON as any
    ).rawJSON

    const SUPPORTS_JSON_RAW_JSON = typeof rawJSON === 'function'

    it('can handle exceeding call stack limits', () => {
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

    it('supports JSON.rawJSON', { skip: !SUPPORTS_JSON_RAW_JSON }, () => {
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
    })
  }
)
