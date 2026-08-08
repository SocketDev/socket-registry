'use strict'

// Upstream probes whether assigning __proto__ MUTATES the prototype chain.
module.exports = function hasProtoMutator() {
  const target = {}
  // The __proto__ setter is the feature this probe exists to test.
  // eslint-disable-next-line no-proto -- probe target
  target.__proto__ = { foo: true }
  return target.foo === true
}
