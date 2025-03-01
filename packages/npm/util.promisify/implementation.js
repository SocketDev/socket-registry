'use strict'

const {
  promisify: UtilPromisify,
  promisify: { custom }
  // Use non-'node:' prefixed require to avoid Webpack errors.
  // eslint-disable-next-line n/prefer-node-protocol
} = require('util')

const customPromisifyArgs = Object.getOwnPropertySymbols(
  // Use non-'node:' prefixed require to avoid Webpack errors.
  // eslint-disable-next-line n/prefer-node-protocol
  require('fs').read
).find(s => s.description === 'customPromisifyArgs')

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
