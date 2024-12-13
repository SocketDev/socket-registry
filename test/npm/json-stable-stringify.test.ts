import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const eco = 'npm'
const regPkgName = path.basename(__filename, '.test.ts')

describe(
  `${eco} > ${regPkgName}`,
  { skip: isPackageTestingSkipped(eco, regPkgName) },
  () => {
    const rawJSON: ((_str: string) => { rawJSON: string }) | undefined = (
      JSON as any
    ).rawJSON

    const SUPPORTS_JSON_RAW_JSON = typeof rawJSON === 'function'

    const jsonStableStringify = require(regPkgName)

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
