'use strict'

const allPossibleTypedArrays = [
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
]

module.exports = function availableTypedArrays() {
  return allPossibleTypedArrays.slice()
}
