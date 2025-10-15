'use strict'

const nodeAssert = /*@__PURE__*/ require('node:assert')
const assertIsDeepEqual = nodeAssert.deepEqual

const nodeUtil = /*@__PURE__*/ require('node:util')
const isDeepStrictEqual = nodeUtil.isDeepStrictEqual

module.exports = function deepEqual(value1, value2, options) {
  if ({ __proto__: null, ...options }.strict) {
    return isDeepStrictEqual(value1, value2)
  }
  try {
    assertIsDeepEqual(value1, value2)
    return true
  } catch {}
  return false
}
