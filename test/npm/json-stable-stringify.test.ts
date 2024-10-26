import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// @ts-ignore
import { isPackageTestingSkipped } from '@socketregistry/scripts/utils/tests'

const eco = 'npm'
const regPkgName = 'json-stable-stringify'

describe(
  `${eco} > ${regPkgName}`,
  { skip: isPackageTestingSkipped(eco, regPkgName) },
  () => {
    const jsonStableStringify: any = require(regPkgName)

    const rawJSON: ((_str: string) => { rawJSON: string }) | undefined = (
      JSON as any
    ).rawJSON

    const SUPPORTS_JSON_RAW_JSON = typeof rawJSON === 'function'

    it('can handle exceeding call stack limits', () => {
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
