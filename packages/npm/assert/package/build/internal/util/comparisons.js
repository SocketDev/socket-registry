// Currently in sync with Node.js lib/internal/util/comparisons.js
// https://github.com/nodejs/node/commit/112cc7c27551254aa2b17098fb774867f05ed0d9

'use strict'

function _slicedToArray(arr, i) {
  return (
    _arrayWithHoles(arr) ||
    _iterableToArrayLimit(arr, i) ||
    _unsupportedIterableToArray(arr, i) ||
    _nonIterableRest()
  )
}
function _nonIterableRest() {
  throw new TypeError(
    'Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.'
  )
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) {
    return
  }
  if (typeof o === 'string') {
    return _arrayLikeToArray(o, minLen)
  }
  let n = Object.prototype.toString.call(o).slice(8, -1)
  if (n === 'Object' && o.constructor) {
    n = o.constructor.name
  }
  if (n === 'Map' || n === 'Set') {
    return Array.from(o)
  }
  if (n === 'Arguments' || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) {
    return _arrayLikeToArray(o, minLen)
  }
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) {
    len = arr.length
  }
  for (let i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i]
  }
  return arr2
}
function _iterableToArrayLimit(r, l) {
  let t =
    null == r
      ? null
      : ('undefined' != typeof Symbol && r[Symbol.iterator]) || r['@@iterator']
  if (null != t) {
    let e,
      n,
      i,
      u,
      a = [],
      f = !0,
      o = !1
    try {
      if (((i = (t = t.call(r)).next), 0 === l)) {
        if (Object(t) !== t) {
          return
        }
        f = !1
      } else {
        for (
          ;
          !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l);
          f = !0
        ) {}
      }
    } catch (r) {
      ;(o = !0), (n = r)
    } finally {
      try {
        if (!f && null != t.return && ((u = t.return()), Object(u) !== u)) {
          // eslint-disable-next-line no-unsafe-finally
          return
        }
      } finally {
        if (o) {
          // eslint-disable-next-line no-unsafe-finally
          throw n
        }
      }
    }
    return a
  }
}
function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) {
    return arr
  }
}
function _typeof(o) {
  '@babel/helpers - typeof'
  return (
    (_typeof =
      'function' == typeof Symbol && 'symbol' == typeof Symbol.iterator
        ? function (o) {
            return typeof o
          }
        : function (o) {
            return o &&
              'function' == typeof Symbol &&
              o.constructor === Symbol &&
              o !== Symbol.prototype
              ? 'symbol'
              : typeof o
          }),
    _typeof(o)
  )
}
const regexFlagsSupported = /a/g.flags !== undefined
const arrayFromSet = function arrayFromSet(set) {
  const array = []
  set.forEach(function (value) {
    return array.push(value)
  })
  return array
}
const arrayFromMap = function arrayFromMap(map) {
  const array = []
  map.forEach(function (value, key) {
    return array.push([key, value])
  })
  return array
}
const objectIs = Object.is ? Object.is : require('object-is')
const objectGetOwnPropertySymbols = Object.getOwnPropertySymbols
  ? Object.getOwnPropertySymbols
  : function () {
      return []
    }
const numberIsNaN = Number.isNaN ? Number.isNaN : require('is-nan')
function uncurryThis(f) {
  return f.call.bind(f)
}
const hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty)
const propertyIsEnumerable = uncurryThis(Object.prototype.propertyIsEnumerable)
const objectToString = uncurryThis(Object.prototype.toString)
const _require$types = require('util/').types,
  isAnyArrayBuffer = _require$types.isAnyArrayBuffer,
  isArrayBufferView = _require$types.isArrayBufferView,
  isDate = _require$types.isDate,
  isMap = _require$types.isMap,
  isRegExp = _require$types.isRegExp,
  isSet = _require$types.isSet,
  isNativeError = _require$types.isNativeError,
  isBoxedPrimitive = _require$types.isBoxedPrimitive,
  isNumberObject = _require$types.isNumberObject,
  isStringObject = _require$types.isStringObject,
  isBooleanObject = _require$types.isBooleanObject,
  isBigIntObject = _require$types.isBigIntObject,
  isSymbolObject = _require$types.isSymbolObject,
  isFloat32Array = _require$types.isFloat32Array,
  isFloat64Array = _require$types.isFloat64Array
function isNonIndex(key) {
  if (key.length === 0 || key.length > 10) {
    return true
  }
  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i)
    if (code < 48 || code > 57) {
      return true
    }
  }
  // The maximum size for an array is 2 ** 32 -1.
  return key.length === 10 && key >= Math.pow(2, 32)
}
function getOwnNonIndexProperties(value) {
  return Object.keys(value)
    .filter(isNonIndex)
    .concat(
      objectGetOwnPropertySymbols(value).filter(
        Object.prototype.propertyIsEnumerable.bind(value)
      )
    )
}

// Taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function compare(a, b) {
  if (a === b) {
    return 0
  }
  let x = a.length
  let y = b.length
  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }
  if (x < y) {
    return -1
  }
  if (y < x) {
    return 1
  }
  return 0
}
const ONLY_ENUMERABLE = undefined
const kStrict = true
const kLoose = false
const kNoIterator = 0
const kIsArray = 1
const kIsSet = 2
const kIsMap = 3

// Check if they have the same source and flags
function areSimilarRegExps(a, b) {
  return regexFlagsSupported
    ? a.source === b.source && a.flags === b.flags
    : RegExp.prototype.toString.call(a) === RegExp.prototype.toString.call(b)
}
function areSimilarFloatArrays(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false
  }
  for (let offset = 0; offset < a.byteLength; offset++) {
    if (a[offset] !== b[offset]) {
      return false
    }
  }
  return true
}
function areSimilarTypedArrays(a, b) {
  if (a.byteLength !== b.byteLength) {
    return false
  }
  return (
    compare(
      new Uint8Array(a.buffer, a.byteOffset, a.byteLength),
      new Uint8Array(b.buffer, b.byteOffset, b.byteLength)
    ) === 0
  )
}
function areEqualArrayBuffers(buf1, buf2) {
  return (
    buf1.byteLength === buf2.byteLength &&
    compare(new Uint8Array(buf1), new Uint8Array(buf2)) === 0
  )
}
function isEqualBoxedPrimitive(val1, val2) {
  if (isNumberObject(val1)) {
    return (
      isNumberObject(val2) &&
      objectIs(
        Number.prototype.valueOf.call(val1),
        Number.prototype.valueOf.call(val2)
      )
    )
  }
  if (isStringObject(val1)) {
    return (
      isStringObject(val2) &&
      String.prototype.valueOf.call(val1) ===
        String.prototype.valueOf.call(val2)
    )
  }
  if (isBooleanObject(val1)) {
    return (
      isBooleanObject(val2) &&
      Boolean.prototype.valueOf.call(val1) ===
        Boolean.prototype.valueOf.call(val2)
    )
  }
  if (isBigIntObject(val1)) {
    return (
      isBigIntObject(val2) &&
      BigInt.prototype.valueOf.call(val1) ===
        BigInt.prototype.valueOf.call(val2)
    )
  }
  return (
    isSymbolObject(val2) &&
    Symbol.prototype.valueOf.call(val1) === Symbol.prototype.valueOf.call(val2)
  )
}

// Notes: Type tags are historical [[Class]] properties that can be set by
// FunctionTemplate::SetClassName() in C++ or Symbol.toStringTag in JS
// and retrieved using Object.prototype.toString.call(obj) in JS
// See https://tc39.github.io/ecma262/#sec-object.prototype.tostring
// for a list of tags pre-defined in the spec.
// There are some unspecified tags in the wild too (e.g. typed array tags).
// Since tags can be altered, they only serve fast failures
//
// Typed arrays and buffers are checked by comparing the content in their
// underlying ArrayBuffer. This optimization requires that it's
// reasonable to interpret their underlying memory in the same way,
// which is checked by comparing their type tags.
// (e.g. a Uint8Array and a Uint16Array with the same memory content
// could still be different because they will be interpreted differently).
//
// For strict comparison, objects should have
// a) The same built-in type tags
// b) The same prototypes.

function innerDeepEqual(val1, val2, strict, memos) {
  // All identical values are equivalent, as determined by ===.
  if (val1 === val2) {
    if (val1 !== 0) {
      return true
    }
    return strict ? objectIs(val1, val2) : true
  }

  // Check more closely if val1 and val2 are equal.
  if (strict) {
    if (_typeof(val1) !== 'object') {
      return typeof val1 === 'number' && numberIsNaN(val1) && numberIsNaN(val2)
    }
    if (_typeof(val2) !== 'object' || val1 === null || val2 === null) {
      return false
    }
    if (Object.getPrototypeOf(val1) !== Object.getPrototypeOf(val2)) {
      return false
    }
  } else {
    if (val1 === null || _typeof(val1) !== 'object') {
      if (val2 === null || _typeof(val2) !== 'object') {
        return val1 == val2
      }
      return false
    }
    if (val2 === null || _typeof(val2) !== 'object') {
      return false
    }
  }
  const val1Tag = objectToString(val1)
  const val2Tag = objectToString(val2)
  if (val1Tag !== val2Tag) {
    return false
  }
  if (Array.isArray(val1)) {
    // Check for sparse arrays and general fast path
    if (val1.length !== val2.length) {
      return false
    }
    const keys1 = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE)
    const keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE)
    if (keys1.length !== keys2.length) {
      return false
    }
    return keyCheck(val1, val2, strict, memos, kIsArray, keys1)
  }
  // [browserify] This triggers on certain types in IE (Map/Set) so we don't
  // wan't to early return out of the rest of the checks. However we can check
  // if the second value is one of these values and the first isn't.
  if (val1Tag === '[object Object]') {
    // return keyCheck(val1, val2, strict, memos, kNoIterator);
    if ((!isMap(val1) && isMap(val2)) || (!isSet(val1) && isSet(val2))) {
      return false
    }
  }
  if (isDate(val1)) {
    if (
      !isDate(val2) ||
      Date.prototype.getTime.call(val1) !== Date.prototype.getTime.call(val2)
    ) {
      return false
    }
  } else if (isRegExp(val1)) {
    if (!isRegExp(val2) || !areSimilarRegExps(val1, val2)) {
      return false
    }
  } else if (isNativeError(val1) || val1 instanceof Error) {
    // Do not compare the stack as it might differ even though the error itself
    // is otherwise identical.
    if (val1.message !== val2.message || val1.name !== val2.name) {
      return false
    }
  } else if (isArrayBufferView(val1)) {
    if (!strict && (isFloat32Array(val1) || isFloat64Array(val1))) {
      if (!areSimilarFloatArrays(val1, val2)) {
        return false
      }
    } else if (!areSimilarTypedArrays(val1, val2)) {
      return false
    }
    // Buffer.compare returns true, so val1.length === val2.length. If they both
    // only contain numeric keys, we don't need to exam further than checking
    // the symbols.
    const _keys = getOwnNonIndexProperties(val1, ONLY_ENUMERABLE)
    const _keys2 = getOwnNonIndexProperties(val2, ONLY_ENUMERABLE)
    if (_keys.length !== _keys2.length) {
      return false
    }
    return keyCheck(val1, val2, strict, memos, kNoIterator, _keys)
  } else if (isSet(val1)) {
    if (!isSet(val2) || val1.size !== val2.size) {
      return false
    }
    return keyCheck(val1, val2, strict, memos, kIsSet)
  } else if (isMap(val1)) {
    if (!isMap(val2) || val1.size !== val2.size) {
      return false
    }
    return keyCheck(val1, val2, strict, memos, kIsMap)
  } else if (isAnyArrayBuffer(val1)) {
    if (!areEqualArrayBuffers(val1, val2)) {
      return false
    }
  } else if (isBoxedPrimitive(val1) && !isEqualBoxedPrimitive(val1, val2)) {
    return false
  }
  return keyCheck(val1, val2, strict, memos, kNoIterator)
}
function getEnumerables(val, keys) {
  return keys.filter(function (k) {
    return propertyIsEnumerable(val, k)
  })
}
function keyCheck(val1, val2, strict, memos, iterationType, aKeys) {
  // For all remaining Object pairs, including Array, objects and Maps,
  // equivalence is determined by having:
  // a) The same number of owned enumerable properties
  // b) The same set of keys/indexes (although not necessarily the same order)
  // c) Equivalent values for every corresponding key/index
  // d) For Sets and Maps, equal contents
  // Note: this accounts for both named and indexed properties on Arrays.
  if (arguments.length === 5) {
    aKeys = Object.keys(val1)
    const bKeys = Object.keys(val2)

    // The pair must have the same number of owned properties.
    if (aKeys.length !== bKeys.length) {
      return false
    }
  }

  // Cheap key test
  let i = 0
  for (; i < aKeys.length; i++) {
    if (!hasOwnProperty(val2, aKeys[i])) {
      return false
    }
  }
  if (strict && arguments.length === 5) {
    const symbolKeysA = objectGetOwnPropertySymbols(val1)
    if (symbolKeysA.length !== 0) {
      let count = 0
      for (i = 0; i < symbolKeysA.length; i++) {
        const key = symbolKeysA[i]
        if (propertyIsEnumerable(val1, key)) {
          if (!propertyIsEnumerable(val2, key)) {
            return false
          }
          aKeys.push(key)
          count++
        } else if (propertyIsEnumerable(val2, key)) {
          return false
        }
      }
      const symbolKeysB = objectGetOwnPropertySymbols(val2)
      if (
        symbolKeysA.length !== symbolKeysB.length &&
        getEnumerables(val2, symbolKeysB).length !== count
      ) {
        return false
      }
    } else {
      const _symbolKeysB = objectGetOwnPropertySymbols(val2)
      if (
        _symbolKeysB.length !== 0 &&
        getEnumerables(val2, _symbolKeysB).length !== 0
      ) {
        return false
      }
    }
  }
  if (
    aKeys.length === 0 &&
    (iterationType === kNoIterator ||
      (iterationType === kIsArray && val1.length === 0) ||
      val1.size === 0)
  ) {
    return true
  }

  // Use memos to handle cycles.
  if (memos === undefined) {
    memos = {
      val1: new Map(),
      val2: new Map(),
      position: 0
    }
  } else {
    // We prevent up to two map.has(x) calls by directly retrieving the value
    // and checking for undefined. The map can only contain numbers, so it is
    // safe to check for undefined only.
    const val2MemoA = memos.val1.get(val1)
    if (val2MemoA !== undefined) {
      const val2MemoB = memos.val2.get(val2)
      if (val2MemoB !== undefined) {
        return val2MemoA === val2MemoB
      }
    }
    memos.position++
  }
  memos.val1.set(val1, memos.position)
  memos.val2.set(val2, memos.position)
  const areEq = objEquiv(val1, val2, strict, aKeys, memos, iterationType)
  memos.val1.delete(val1)
  memos.val2.delete(val2)
  return areEq
}
function setHasEqualElement(set, val1, strict, memo) {
  // Go looking.
  const setValues = arrayFromSet(set)
  for (let i = 0; i < setValues.length; i++) {
    const val2 = setValues[i]
    if (innerDeepEqual(val1, val2, strict, memo)) {
      // Remove the matching element to make sure we do not check that again.
      set.delete(val2)
      return true
    }
  }
  return false
}

// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness#Loose_equality_using
// Sadly it is not possible to detect corresponding values properly in case the
// type is a string, number, bigint or boolean. The reason is that those values
// can match lots of different string values (e.g., 1n == '+00001').
function findLooseMatchingPrimitives(prim) {
  switch (_typeof(prim)) {
    case 'undefined':
      return null
    case 'object':
      // Only pass in null as object!
      return undefined
    case 'symbol':
      return false
    case 'string':
      prim = +prim
    // Loose equal entries exist only if the string is possible to convert to
    // a regular number and not NaN.
    // Fall through
    case 'number':
      if (numberIsNaN(prim)) {
        return false
      }
  }
  return true
}
function setMightHaveLoosePrim(a, b, prim) {
  const altValue = findLooseMatchingPrimitives(prim)
  if (altValue != null) {
    return altValue
  }
  return b.has(altValue) && !a.has(altValue)
}
function mapMightHaveLoosePrim(a, b, prim, item, memo) {
  const altValue = findLooseMatchingPrimitives(prim)
  if (altValue != null) {
    return altValue
  }
  const curB = b.get(altValue)
  if (
    (curB === undefined && !b.has(altValue)) ||
    !innerDeepEqual(item, curB, false, memo)
  ) {
    return false
  }
  return !a.has(altValue) && innerDeepEqual(item, curB, false, memo)
}
function setEquiv(a, b, strict, memo) {
  // This is a lazily initiated Set of entries which have to be compared
  // pairwise.
  let set = null
  const aValues = arrayFromSet(a)
  for (let i = 0; i < aValues.length; i++) {
    const val = aValues[i]
    // Note: Checking for the objects first improves the performance for object
    // heavy sets but it is a minor slow down for primitives. As they are fast
    // to check this improves the worst case scenario instead.
    if (_typeof(val) === 'object' && val !== null) {
      if (set === null) {
        set = new Set()
      }
      // If the specified value doesn't exist in the second set its an not null
      // object (or non strict only: a not matching primitive) we'll need to go
      // hunting for something thats deep-(strict-)equal to it. To make this
      // O(n log n) complexity we have to copy these values in a new set first.
      set.add(val)
    } else if (!b.has(val)) {
      if (strict) {
        return false
      }

      // Fast path to detect missing string, symbol, undefined and null values.
      if (!setMightHaveLoosePrim(a, b, val)) {
        return false
      }
      if (set === null) {
        set = new Set()
      }
      set.add(val)
    }
  }
  if (set !== null) {
    const bValues = arrayFromSet(b)
    for (let _i = 0; _i < bValues.length; _i++) {
      const _val = bValues[_i]
      // We have to check if a primitive value is already
      // matching and only if it's not, go hunting for it.
      if (_typeof(_val) === 'object' && _val !== null) {
        if (!setHasEqualElement(set, _val, strict, memo)) {
          return false
        }
      } else if (
        !strict &&
        !a.has(_val) &&
        !setHasEqualElement(set, _val, strict, memo)
      ) {
        return false
      }
    }
    return set.size === 0
  }
  return true
}
function mapHasEqualEntry(set, map, key1, item1, strict, memo) {
  // To be able to handle cases like:
  //   Map([[{}, 'a'], [{}, 'b']]) vs Map([[{}, 'b'], [{}, 'a']])
  // ... we need to consider *all* matching keys, not just the first we find.
  const setValues = arrayFromSet(set)
  for (let i = 0; i < setValues.length; i++) {
    const key2 = setValues[i]
    if (
      innerDeepEqual(key1, key2, strict, memo) &&
      innerDeepEqual(item1, map.get(key2), strict, memo)
    ) {
      set.delete(key2)
      return true
    }
  }
  return false
}
function mapEquiv(a, b, strict, memo) {
  let set = null
  const aEntries = arrayFromMap(a)
  for (let i = 0; i < aEntries.length; i++) {
    const _aEntries$i = _slicedToArray(aEntries[i], 2),
      key = _aEntries$i[0],
      item1 = _aEntries$i[1]
    if (_typeof(key) === 'object' && key !== null) {
      if (set === null) {
        set = new Set()
      }
      set.add(key)
    } else {
      // By directly retrieving the value we prevent another b.has(key) check in
      // almost all possible cases.
      const item2 = b.get(key)
      if (
        (item2 === undefined && !b.has(key)) ||
        !innerDeepEqual(item1, item2, strict, memo)
      ) {
        if (strict) {
          return false
        }
        // Fast path to detect missing string, symbol, undefined and null
        // keys.
        if (!mapMightHaveLoosePrim(a, b, key, item1, memo)) {
          return false
        }
        if (set === null) {
          set = new Set()
        }
        set.add(key)
      }
    }
  }
  if (set !== null) {
    const bEntries = arrayFromMap(b)
    for (let _i2 = 0; _i2 < bEntries.length; _i2++) {
      const _bEntries$_i = _slicedToArray(bEntries[_i2], 2),
        _key = _bEntries$_i[0],
        item = _bEntries$_i[1]
      if (_typeof(_key) === 'object' && _key !== null) {
        if (!mapHasEqualEntry(set, a, _key, item, strict, memo)) {
          return false
        }
      } else if (
        !strict &&
        (!a.has(_key) || !innerDeepEqual(a.get(_key), item, false, memo)) &&
        !mapHasEqualEntry(set, a, _key, item, false, memo)
      ) {
        return false
      }
    }
    return set.size === 0
  }
  return true
}
function objEquiv(a, b, strict, keys, memos, iterationType) {
  // Sets and maps don't have their entries accessible via normal object
  // properties.
  let i = 0
  if (iterationType === kIsSet) {
    if (!setEquiv(a, b, strict, memos)) {
      return false
    }
  } else if (iterationType === kIsMap) {
    if (!mapEquiv(a, b, strict, memos)) {
      return false
    }
  } else if (iterationType === kIsArray) {
    for (; i < a.length; i++) {
      if (hasOwnProperty(a, i)) {
        if (
          !hasOwnProperty(b, i) ||
          !innerDeepEqual(a[i], b[i], strict, memos)
        ) {
          return false
        }
      } else if (hasOwnProperty(b, i)) {
        return false
      } else {
        // Array is sparse.
        const keysA = Object.keys(a)
        for (; i < keysA.length; i++) {
          const key = keysA[i]
          if (
            !hasOwnProperty(b, key) ||
            !innerDeepEqual(a[key], b[key], strict, memos)
          ) {
            return false
          }
        }
        if (keysA.length !== Object.keys(b).length) {
          return false
        }
        return true
      }
    }
  }

  // The pair must have equivalent values for every corresponding key.
  // Possibly expensive deep test:
  for (i = 0; i < keys.length; i++) {
    const _key2 = keys[i]
    if (!innerDeepEqual(a[_key2], b[_key2], strict, memos)) {
      return false
    }
  }
  return true
}
function isDeepEqual(val1, val2) {
  return innerDeepEqual(val1, val2, kLoose)
}
function isDeepStrictEqual(val1, val2) {
  return innerDeepEqual(val1, val2, kStrict)
}
module.exports = {
  isDeepEqual: isDeepEqual,
  isDeepStrictEqual: isDeepStrictEqual
}
