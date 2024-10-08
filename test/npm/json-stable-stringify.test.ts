import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const regPkgName = 'json-stable-stringify'
const jsonStableStringify: any = require(regPkgName)

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

describe(`npm > ${regPkgName}`, () => {
  it('can handle exceeding call stack limits', () => {
    assert.doesNotThrow(() =>
      jsonStableStringify(createCallStackBusterObject())
    )
  })
})
