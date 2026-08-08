'use strict'

// Upstream probes whether __proto__ works as a GETTER on plain objects.
module.exports = function hasProtoAccessor() {
  const test = { __proto__: { foo: true } }
  return test.foo === true && !('toString' in { __proto__: null })
}
