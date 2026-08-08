'use strict'

const { isBuiltin } = /*@__PURE__*/ require('node:module')
// node:module.isBuiltin has no version knowledge; explicit nodeVersion
// queries fork to the portable data-table implementation so the node lane
// carries the full upstream contract instead of refusing part of it.
const portableIsCore = /*@__PURE__*/ require('./index.js')

module.exports = function isCore(moduleName, nodeVersion) {
  if (nodeVersion !== undefined) {
    return portableIsCore(moduleName, nodeVersion)
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
