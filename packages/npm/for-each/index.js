'use strict'

const { isArray: ArrayIsArray } = Array
const { hasOwn: ObjectHasOwn, keys: ObjectKeys } = Object

function forEachArray(arr, callbackFn, thisArg) {
  for (let i = 0, { length } = arr; i < length; i += 1) {
    if (ObjectHasOwn(arr, i)) {
      if (thisArg == null) {
        callbackFn(arr[i], i, arr)
      } else {
        callbackFn.call(thisArg, arr[i], i, arr)
      }
    }
  }
}

function forEachObject(obj, callbackFn, thisArg) {
  const keys = ObjectKeys(obj)
  for (let i = 0, { length } = keys; i < length; i += 1) {
    const key = keys[i]
    if (thisArg == null) {
      callbackFn(obj[key], key, obj)
    } else {
      callbackFn.call(thisArg, obj[key], key, obj)
    }
  }
}

function forEachString(str, callbackFn, thisArg) {
  for (let i = 0, { length } = str; i < length; i += 1) {
    if (thisArg == null) {
      callbackFn(str[i], i, str)
    } else {
      callbackFn.call(thisArg, str[i], i, str)
    }
  }
}

module.exports = function forEach(list, callbackFn, thisArg) {
  if (typeof callbackFn !== 'function') {
    throw new TypeError('callbackFn must be a function')
  }
  if (ArrayIsArray(list)) {
    forEachArray(list, callbackFn, thisArg)
  } else if (typeof list === 'string') {
    forEachString(list, callbackFn, thisArg)
  } else {
    forEachObject(list, callbackFn, thisArg)
  }
}
