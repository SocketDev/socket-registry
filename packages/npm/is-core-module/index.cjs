'use strict'

const nodeModule = /*@__PURE__*/ require('node:module')
const isBuiltin = nodeModule.isBuiltin

module.exports = function isCore(moduleName, nodeVersion) {
  if (typeof nodeVersion === 'string') {
    throw new TypeError(
      'nodeVersion parameter not supported.\nPlease report this error to https://github.com/SocketDev/socket-registry/issues.',
    )
  }
  // Upstream looks the name up as a property key, so ToPropertyKey coercion
  // (and any throw it raises) is part of the contract; module.isBuiltin
  // swallows that, so the coercion is a required fork, not an optimization.
  // The computed key runs the real ToPropertyKey: boxed Symbols unwrap to
  // symbol keys, objects run their toPrimitive/toString, throws propagate.
  let key = moduleName
  if (typeof key !== 'string') {
    key = Reflect.ownKeys({ __proto__: null, [key]: 0 })[0]
    if (typeof key !== 'string') {
      return false
    }
  }
  return isBuiltin(key)
}
