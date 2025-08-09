'use strict'

// Use non-'node:' prefixed require to avoid Webpack errors.
// eslint-disable-next-line n/prefer-node-protocol
const nodeUtil = /*@__PURE__*/ require('util')
const UtilPromisify = nodeUtil.promisify
const { custom } = UtilPromisify

// Use non-'node:' prefixed require to avoid Webpack errors.
// eslint-disable-next-line n/prefer-node-protocol
const nodeFs = /*@__PURE__*/ require('fs')
const read = nodeFs.read
const customPromisifyArgs = Object.getOwnPropertySymbols(read).find(
  s => s.description === 'customPromisifyArgs'
)

module.exports = Object.assign(
  function promisify(original) {
    return UtilPromisify(original)
  },
  {
    custom,
    customPromisifyArgs
  }
)
module.exports.custom = module.exports.custom
module.exports.customPromisifyArgs = module.exports.customPromisifyArgs
