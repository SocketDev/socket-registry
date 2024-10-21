'use strict'

const {
  promisify: UtilPromisify,
  promisify: { custom }
} = require('node:util')

const customPromisifyArgs = Object.getOwnPropertySymbols(
  require('node:fs').read
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
