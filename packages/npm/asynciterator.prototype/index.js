'use strict'

const asyncGeneratorProtoObj = Reflect.getPrototypeOf((async function* () {})())
const AsyncGeneratorPrototype = Reflect.getPrototypeOf(asyncGeneratorProtoObj)
const AsyncIteratorPrototype = Reflect.getPrototypeOf(AsyncGeneratorPrototype)

// Add Symbol.iterator property because the shim incorrectly adds it too.
// We at least make it non-enumerable.
module.exports = Object.defineProperty(
  AsyncIteratorPrototype,
  Symbol.iterator,
  {
    __proto__: null,
    configurable: true,
    value() {
      return this
    },
    writable: true
  }
)
