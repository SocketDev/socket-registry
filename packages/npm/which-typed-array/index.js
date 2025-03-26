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
  return {
    name,
    check(value) {
      try {
        return getter.call(value) === expected
      } catch {}
      return false
    }
  }
})

const { length: attempts } = attempters

module.exports = function whichTypedArray(value) {
  if (value !== null && typeof value === 'object') {
    for (let i = 0; i < attempts; i += 1) {
      const attempt = attempters[i]
      if (attempt.check(value)) {
        return attempt.name
      }
    }
  }
  return false
}
