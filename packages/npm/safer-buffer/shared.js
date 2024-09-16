'use strict'

const builtinBufferExports = require('node:buffer')

const builtinBufferExportsDescMap = Object.fromEntries(
  Object.entries(Object.getOwnPropertyDescriptors(builtinBufferExports)).filter(
    ({ 0: key }) => key !== 'Buffer' && key !== 'SlowBuffer'
  )
)

module.exports = {
  builtinBufferExportsDescMap
}
