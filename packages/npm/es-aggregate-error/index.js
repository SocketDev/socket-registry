'use strict'

const Impl = require('./implementation')

const desc = (value, configurable = true, writable = true) => ({
  __proto__: null,
  configurable,
  value,
  writable
})

const EsAggregateError = function AggregateError(errors, message) {
  // The function call AggregateError(…) is equivalent to the object creation
  // expression new AggregateError(…) with the same arguments.
  // https://tc39.es/ecma262/#sec-aggregate-error-constructor
  return new Impl(errors, message)
}

// The %AggregateError.prototype% is a plain object
// https://tc39.es/ecma262/#sec-properties-of-the-aggregate-error-prototype-objects
const EsAggregateErrorProto = Object.defineProperties(
  {},
  {
    // Copy "message", "name", and any future added prototype properties.
    ...Object.getOwnPropertyDescriptors(Impl.prototype),
    constructor: desc(EsAggregateError)
  }
)

// and has as a [[Prototype]] internal slot whose value is %Error.prototype%.
Reflect.setPrototypeOf(EsAggregateErrorProto, Error.prototype)

module.exports = Object.defineProperties(EsAggregateError, {
  prototype: desc(EsAggregateErrorProto, false, false),
  getPolyfill: desc(require('./polyfill')),
  implementation: desc(Impl),
  shim: desc(require('./shim')),
  [Symbol.hasInstance]: desc(instance => instance instanceof Impl)
})
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
