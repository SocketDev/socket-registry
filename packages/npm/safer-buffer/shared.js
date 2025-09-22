'use strict'

// Use non-'node:' prefixed require to avoid Webpack errors.
// eslint-disable-next-line n/prefer-node-protocol
const builtinBufferExports = require('buffer')

const builtinBufferExportsDescMap = Object.fromEntries(
  Object.entries(Object.getOwnPropertyDescriptors(builtinBufferExports)).filter(
    ({ 0: key }) => key !== 'Buffer' && key !== 'SlowBuffer',
  ),
)

module.exports = {
  builtinBufferExportsDescMap,
}
