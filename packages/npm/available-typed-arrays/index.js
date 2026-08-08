'use strict'

const allPossibleTypedArrays = [
  'Float16Array',
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
  'BigUint64Array',
]

// Filtered per call, matching upstream: availability reflects the runtime at
// call time, and absent globals are never reported.
module.exports = function availableTypedArrays() {
  const out = []
  for (let i = 0, { length } = allPossibleTypedArrays; i < length; i += 1) {
    const name = allPossibleTypedArrays[i]
    if (typeof globalThis[name] === 'function') {
      out.push(name)
    }
  }
  return out
}
