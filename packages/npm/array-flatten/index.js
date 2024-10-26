'use strict'

const { isArray: ArrayIsArray } = Array
const TypeErrorCtor = TypeError

function flatten(arr) {
  return ArrayIsArray(arr)
    ? arr.flat(Infinity)
    : flattenFromDepth(arr, Infinity)
}

function flattenLegacy(arr) {
  // Support array-flatten v1 call signature.
  // https://github.com/blakeembrey/array-flatten/blob/v1.1.1/array-flatten.js#L58
  const isV1Api = arguments.length === 2
  const depth = isV1Api ? (arguments[1] ?? Infinity) : Infinity
  if (!isV1Api && !ArrayIsArray(arr)) {
    throw new TypeErrorCtor('Expected value to be an array')
  }
  return ArrayIsArray(arr) ? arr.flat(depth) : flattenFromDepth(arr, depth)
}

function flattenDepth(arr, depth) {
  if (!ArrayIsArray(arr)) {
    throw new TypeErrorCtor('Expected value to be an array')
  }
  if (typeof depth !== 'number') {
    throw new TypeErrorCtor('Expected the depth to be a number')
  }
  return arr.flat(depth)
}

function flattenFrom(arr) {
  return flattenDownDepth(arr, [], Infinity)
}

function flattenFromDepth(arr, depth) {
  if (typeof depth !== 'number') {
    throw new TypeErrorCtor('Expected the depth to be a number')
  }
  return flattenDownDepth(arr, [], depth)
}

function flattenDownDepth(arr, result, depth) {
  depth -= 1
  for (let i = 0, { length } = arr; i < length; i += 1) {
    const value = arr[i]
    if (depth > -1 && ArrayIsArray(value)) {
      flattenDownDepth(value, result, depth)
    } else {
      result[result.length] = value
    }
  }
  return result
}

// Support array-flatten v1 API.
// https://github.com/blakeembrey/array-flatten/blob/v1.1.1/array-flatten.js
module.exports = flattenLegacy
// Support array-flatten v3 API.
// https://github.com/blakeembrey/array-flatten/blob/v3.0.0/src/index.ts
module.exports.flatten = flatten
// Support array-flatten v2 API.
// https://github.com/blakeembrey/array-flatten/blob/v2.1.2/array-flatten.js
module.exports.depth = flattenDepth
module.exports.from = flattenFrom
module.exports.fromDepth = flattenFromDepth
