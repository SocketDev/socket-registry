'use strict'

const { isArray: ArrayIsArray } = Array

function flatten(array) {
  if (!ArrayIsArray(array)) {
    throw new TypeError('Expected value to be an array')
  }
  // Support array-flatten v1 call signature.
  // https://github.com/blakeembrey/array-flatten/blob/v1.1.1/array-flatten.js#L58
  const depth = arguments.length === 2 ? (arguments[1] ?? Infinity) : Infinity
  return array.flat(depth)
}

function flattenDepth(array, depth) {
  if (!ArrayIsArray(array)) {
    throw new TypeError('Expected value to be an array')
  }
  if (typeof depth !== 'number') {
    throw new TypeError('Expected the depth to be a number')
  }
  return array.flat(depth)
}

function flattenFrom(array) {
  return flattenDownDepth(array, [], Infinity)
}

function flattenFromDepth(array, depth) {
  if (typeof depth !== 'number') {
    throw new TypeError('Expected the depth to be a number')
  }
  return flattenDownDepth(array, [], depth)
}

function flattenDownDepth(array, result, depth) {
  depth -= 1
  for (let i = 0, { length } = array; i < length; i += 1) {
    const value = array[i]
    if (depth > -1 && ArrayIsArray(value)) {
      flattenDownDepth(value, result, depth)
    } else {
      result.push(value)
    }
  }
  return result
}

// Support array-flatten v1 API.
// https://github.com/blakeembrey/array-flatten/blob/v1.1.1/array-flatten.js
module.exports = flatten
// Support array-flatten v3 API.
// https://github.com/blakeembrey/array-flatten/blob/v3.0.0/src/index.ts
module.exports.flatten = flatten
// Support array-flatten v2 API.
// https://github.com/blakeembrey/array-flatten/blob/v2.1.2/array-flatten.js
module.exports.depth = flattenDepth
module.exports.from = flattenFrom
module.exports.fromDepth = flattenFromDepth
