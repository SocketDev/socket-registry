'use strict'

// eslint-disable-next-line n/prefer-node-protocol
const nodeAssert = /*@__PURE__*/ require('assert')
const assertIsDeepEqual = nodeAssert.deepEqual
// eslint-disable-next-line n/prefer-node-protocol
const nodeUtil = /*@__PURE__*/ require('util')
const isDeepStrictEqual = nodeUtil.isDeepStrictEqual

module.exports = function deepEqual(value1, value2, options) {
  try {
    return { __proto__: null, ...options }.strict
      ? isDeepStrictEqual(value1, value2)
      : assertIsDeepEqual(value1, value2)
  } catch {}
  return false
}
