'use strict'

const ArrayCtor = Array
const { isArray: ArrayIsArray } = ArrayCtor

// This implementation avoids a V8 perf issue associated with setting Symbol.isConcatSpreadable:
// https://issues.chromium.org/issues/42204235#comment4
module.exports = function safeArrayConcat(_item) {
  // Compute size to pre-allocate the result array.
  // The assumption here is the number of arguments provided is low so the cost
  // of iterating over them twice is nominal.
  let size = 0
  for (let i = 0, { length } = arguments; i < length; i += 1) {
    const arg = arguments[i]
    size += ArrayIsArray(arg) ? arg.length : 1
  }
  const result = ArrayCtor(size)
  let pos = 0
  for (let i = 0, { length } = arguments; i < length; i += 1) {
    const arg = arguments[i]
    if (ArrayIsArray(arg)) {
      for (let j = 0, { length: length_j } = arg; j < length_j; j += 1) {
        result[pos++] = arg[j]
      }
    } else {
      result[pos++] = arg
    }
  }
  return result
}
