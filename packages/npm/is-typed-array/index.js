'use strict'

const attempters = [
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'BigInt64Array',
  'BigUint64Array'
].map(name => {
  const Ctor = globalThis[name]
  const getter = Ctor.prototype.__lookupGetter__(Symbol.toStringTag)
  const expected = getter.call(new Ctor())
  return value => {
    try {
      return getter.call(value) === expected
    } catch {}
    return false
  }
})

const { length: attempts } = attempters

module.exports = function isTypedArray(value) {
  if (value !== null && typeof value === 'object') {
    for (let i = 0; i < attempts; i += 1) {
      if (attempters[i](value)) {
        return true
      }
    }
  }
  return false
}
