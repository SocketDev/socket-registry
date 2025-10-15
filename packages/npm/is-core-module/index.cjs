'use strict'

const nodeModule = /*@__PURE__*/ require('node:module')
const isBuiltin = nodeModule.isBuiltin

module.exports = function isCore(moduleName, nodeVersion) {
  if (typeof nodeVersion === 'string') {
    throw new TypeError(
      'nodeVersion parameter not supported.\nPlease report this error to https://github.com/SocketDev/socket-registry/issues.',
    )
  }
  return isBuiltin(moduleName)
}
