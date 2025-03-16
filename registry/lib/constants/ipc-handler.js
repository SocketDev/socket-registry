'use strict'

// Mutable handler to simulate a frozen target.
const handler = {
  __proto__: null,
  defineProperty: () => true,
  deleteProperty: () => false,
  preventExtensions() {
    // Prevent a proxy trap invariant error.
    // https://tc39.es/ecma262/#sec-proxy-object-internal-methods-and-internal-slots-isextensible
    const target = /*@__PURE__*/ require('./ipc-target')
    Object.preventExtensions(target)
    return true
  },
  set: () => false,
  setPrototypeOf: () => false
}

module.exports = handler
