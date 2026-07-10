'use strict'

// Native-API helpers live in ./external/natives so this file stays a faithful,
// minimally-edited copy of the upstream commonjs-assert algorithm below.
const {
  $Set,
  $getTime,
  $mapGet,
  $mapHas,
  $mapSize,
  $objToString,
  $setAdd,
  $setDelete,
  $setHas,
  $setSize,
  assign,
  byteLength,
  flags,
  gPO,
  getIterator,
  getSideChannel,
  is,
  isArguments,
  isArray,
  isArrayBuffer,
  isDate,
  isRegex,
  isSharedArrayBuffer,
  objectKeys,
  sabByteLength,
  whichBoxedPrimitive,
  whichCollection,
  whichTypedArray,
} = /*@__PURE__*/ require('./external/natives')

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L416-L439
function findLooseMatchingPrimitives(prim) {
  if (typeof prim === 'undefined') {
    return undefined
  }
  if (typeof prim === 'object') {
    // Only pass in null as object!
    return void 0
  }
  if (typeof prim === 'symbol') {
    return false
  }
  if (typeof prim === 'string' || typeof prim === 'number') {
    // Loose equal entries exist only if the string is possible to convert to a regular number and not NaN.
    return +prim === +prim // eslint-disable-line no-implicit-coercion
  }
  return true
}

function internalDeepEqual(actual, expected, options, channel) {
  const opts = options || {}

  // 7.1. All identical values are equivalent, as determined by ===.
  if (opts.strict ? is(actual, expected) : actual === expected) {
    return true
  }

  const actualBoxed = whichBoxedPrimitive(actual)
  const expectedBoxed = whichBoxedPrimitive(expected)
  if (actualBoxed !== expectedBoxed) {
    return false
  }

  // 7.3. Other pairs that do not both pass typeof value == 'object', equivalence is determined by ==.
  if (
    !actual ||
    !expected ||
    (typeof actual !== 'object' && typeof expected !== 'object')
  ) {
    return opts.strict ? is(actual, expected) : actual == expected // eslint-disable-line eqeqeq
  }

  /*
   * 7.4. For all other Object pairs, including Array objects, equivalence is
   * determined by having the same number of owned properties (as verified
   * with Object.prototype.hasOwnProperty.call), the same set of keys
   * (although not necessarily the same order), equivalent values for every
   * corresponding key, and an identical 'prototype' property. Note: this
   * accounts for both named and indexed properties on Arrays.
   */
  // see https://github.com/nodejs/node/commit/d3aafd02efd3a403d646a3044adcf14e63a88d32 for memos/channel inspiration

  const hasActual = channel.has(actual)
  const hasExpected = channel.has(expected)
  let sentinel
  if (hasActual && hasExpected) {
    if (channel.get(actual) === channel.get(expected)) {
      return true
    }
  } else {
    sentinel = {}
  }
  if (!hasActual) {
    channel.set(actual, sentinel)
  }
  if (!hasExpected) {
    channel.set(expected, sentinel)
  }

  // eslint-disable-next-line no-use-before-define
  return objEquiv(actual, expected, opts, channel)
}

function isBuffer(x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') {
    return false
  }
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false
  }
  if (x.length > 0 && typeof x[0] !== 'number') {
    return false
  }

  const Ctor = x.constructor
  return !!(typeof Ctor?.isBuffer === 'function' && Ctor.isBuffer(x))
}

function mapEquiv(a, b, options, channel) {
  options = { __proto__: null, ...options }
  if ($mapSize(a) !== $mapSize(b)) {
    return false
  }
  const iA = getIterator(a)
  const iB = getIterator(b)
  let resultA
  let resultB
  let set
  let key
  let item1
  let item2
  while ((resultA = iA.next()) && !resultA.done) {
    key = resultA.value[0]
    item1 = resultA.value[1]
    if (key && typeof key === 'object') {
      if (!set) {
        set = new $Set()
      }
      $setAdd(set, key)
    } else {
      item2 = $mapGet(b, key)
      if (
        (typeof item2 === 'undefined' && !$mapHas(b, key)) ||
        !internalDeepEqual(item1, item2, options, channel)
      ) {
        if (options.strict) {
          return false
        }
        if (!mapMightHaveLoosePrim(a, b, key, item1, options, channel)) {
          return false
        }
        if (!set) {
          set = new $Set()
        }
        $setAdd(set, key)
      }
    }
  }

  if (set) {
    while ((resultB = iB.next()) && !resultB.done) {
      key = resultB.value[0]
      item2 = resultB.value[1]
      if (key && typeof key === 'object') {
        if (!mapHasEqualEntry(set, a, key, item2, options, channel)) {
          return false
        }
      } else if (
        !options.strict &&
        (!a.has(key) ||
          !internalDeepEqual($mapGet(a, key), item2, options, channel)) &&
        !mapHasEqualEntry(
          set,
          a,
          key,
          item2,
          assign({}, options, { strict: false }),
          channel,
        )
      ) {
        return false
      }
    }
    return $setSize(set) === 0
  }
  return true
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L518-L533
function mapHasEqualEntry(set, map, key1, item1, options, channel) {
  const i = getIterator(set)
  let result
  let key2
  while ((result = i.next()) && !result.done) {
    key2 = result.value
    if (
      // eslint-disable-next-line no-use-before-define
      internalDeepEqual(key1, key2, options, channel) &&
      // eslint-disable-next-line no-use-before-define
      internalDeepEqual(item1, $mapGet(map, key2), options, channel)
    ) {
      $setDelete(set, key2)
      return true
    }
  }

  return false
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L449-L460
function mapMightHaveLoosePrim(a, b, prim, item, options, channel) {
  const altValue = findLooseMatchingPrimitives(prim)
  if (altValue != null) {
    return altValue
  }
  const curB = $mapGet(b, altValue)
  const looseOpts = assign({}, options, { strict: false })
  if (
    (typeof curB === 'undefined' && !$mapHas(b, altValue)) ||
    // eslint-disable-next-line no-use-before-define
    !internalDeepEqual(item, curB, looseOpts, channel)
  ) {
    return false
  }
  // eslint-disable-next-line no-use-before-define
  return (
    !$mapHas(a, altValue) && internalDeepEqual(item, curB, looseOpts, channel)
  )
}

function objEquiv(a, b, options, channel) {
  /* eslint max-statements: [2, 100], max-lines-per-function: [2, 120], max-depth: [2, 5], max-lines: [2, 400] */
  options = { __proto__: null, ...options }
  let i, key

  if (typeof a !== typeof b) {
    return false
  }
  if (a == null || b == null) {
    return false
  }

  if ($objToString(a) !== $objToString(b)) {
    return false
  }

  if (isArguments(a) !== isArguments(b)) {
    return false
  }

  const aIsArray = isArray(a)
  const bIsArray = isArray(b)
  if (aIsArray !== bIsArray) {
    return false
  }

  const aIsError = a instanceof Error
  const bIsError = b instanceof Error
  if (aIsError !== bIsError) {
    return false
  }
  if (aIsError || bIsError) {
    if (a.name !== b.name || a.message !== b.message) {
      return false
    }
  }

  const aIsRegex = isRegex(a)
  const bIsRegex = isRegex(b)
  if (aIsRegex !== bIsRegex) {
    return false
  }
  if (
    (aIsRegex || bIsRegex) &&
    (a.source !== b.source || flags(a) !== flags(b))
  ) {
    return false
  }

  const aIsDate = isDate(a)
  const bIsDate = isDate(b)
  if (aIsDate !== bIsDate) {
    return false
  }
  if (aIsDate || bIsDate) {
    // && would work too, because both are true or both false here
    if ($getTime(a) !== $getTime(b)) {
      return false
    }
  }
  if (options.strict && gPO && gPO(a) !== gPO(b)) {
    return false
  }

  const aWhich = whichTypedArray(a)
  const bWhich = whichTypedArray(b)
  if (aWhich !== bWhich) {
    return false
  }
  if (aWhich || bWhich) {
    // && would work too, because both are true or both false here
    if (a.length !== b.length) {
      return false
    }
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false
      }
    }
    return true
  }

  const aIsBuffer = isBuffer(a)
  const bIsBuffer = isBuffer(b)
  if (aIsBuffer !== bIsBuffer) {
    return false
  }
  if (aIsBuffer || bIsBuffer) {
    // && would work too, because both are true or both false here
    if (a.length !== b.length) {
      return false
    }
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return false
      }
    }
    return true
  }

  const aIsArrayBuffer = isArrayBuffer(a)
  const bIsArrayBuffer = isArrayBuffer(b)
  if (aIsArrayBuffer !== bIsArrayBuffer) {
    return false
  }
  if (aIsArrayBuffer || bIsArrayBuffer) {
    // && would work too, because both are true or both false here
    if (byteLength(a) !== byteLength(b)) {
      return false
    }
    return (
      typeof Uint8Array === 'function' &&
      internalDeepEqual(new Uint8Array(a), new Uint8Array(b), options, channel)
    )
  }

  const aIsSAB = isSharedArrayBuffer(a)
  const bIsSAB = isSharedArrayBuffer(b)
  if (aIsSAB !== bIsSAB) {
    return false
  }
  if (aIsSAB || bIsSAB) {
    // && would work too, because both are true or both false here
    if (sabByteLength(a) !== sabByteLength(b)) {
      return false
    }
    return (
      typeof Uint8Array === 'function' &&
      internalDeepEqual(new Uint8Array(a), new Uint8Array(b), options, channel)
    )
  }

  if (typeof a !== typeof b) {
    return false
  }

  const ka = objectKeys(a)
  const kb = objectKeys(b)
  // having the same number of owned properties (keys incorporates hasOwnProperty)
  if (ka.length !== kb.length) {
    return false
  }

  // the same set of keys (although not necessarily the same order),
  ka.sort()
  kb.sort()
  // ~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i]) {
      return false
    } // eslint-disable-line eqeqeq
  }

  // equivalent values for every corresponding key, and ~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i]
    if (!internalDeepEqual(a[key], b[key], options, channel)) {
      return false
    }
  }

  const aCollection = whichCollection(a)
  const bCollection = whichCollection(b)
  if (aCollection !== bCollection) {
    return false
  }
  if (aCollection === 'Set' || bCollection === 'Set') {
    // aCollection === bCollection
    return setEquiv(a, b, options, channel)
  }
  if (aCollection === 'Map') {
    // aCollection === bCollection
    return mapEquiv(a, b, options, channel)
  }

  return true
}

function setEquiv(a, b, options, channel) {
  options = { __proto__: null, ...options }
  if ($setSize(a) !== $setSize(b)) {
    return false
  }
  const iA = getIterator(a)
  const iB = getIterator(b)
  let resultA
  let resultB
  let set
  while ((resultA = iA.next()) && !resultA.done) {
    if (resultA.value && typeof resultA.value === 'object') {
      if (!set) {
        set = new $Set()
      }
      $setAdd(set, resultA.value)
    } else if (!$setHas(b, resultA.value)) {
      if (options.strict) {
        return false
      }
      if (!setMightHaveLoosePrim(a, b, resultA.value)) {
        return false
      }
      if (!set) {
        set = new $Set()
      }
      $setAdd(set, resultA.value)
    }
  }
  if (set) {
    while ((resultB = iB.next()) && !resultB.done) {
      // We have to check if a primitive value is already matching and only if it's not, go hunting for it.
      if (resultB.value && typeof resultB.value === 'object') {
        if (!setHasEqualElement(set, resultB.value, options.strict, channel)) {
          return false
        }
      } else if (
        !options.strict &&
        !$setHas(a, resultB.value) &&
        !setHasEqualElement(set, resultB.value, options.strict, channel)
      ) {
        return false
      }
    }
    return $setSize(set) === 0
  }
  return true
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L401-L414
function setHasEqualElement(set, val1, options, channel) {
  const i = getIterator(set)
  let result
  while ((result = i.next()) && !result.done) {
    if (internalDeepEqual(val1, result.value, options, channel)) {
      // eslint-disable-line no-use-before-define
      // Remove the matching element to make sure we do not check that again.
      $setDelete(set, result.value)
      return true
    }
  }

  return false
}

// taken from https://github.com/browserify/commonjs-assert/blob/bba838e9ba9e28edf3127ce6974624208502f6bc/internal/util/comparisons.js#L441-L447
function setMightHaveLoosePrim(a, b, prim) {
  const altValue = findLooseMatchingPrimitives(prim)
  if (altValue != null) {
    return altValue
  }

  return $setHas(b, altValue) && !$setHas(a, altValue)
}

module.exports = function deepEqual(a, b, options) {
  return internalDeepEqual(a, b, options, getSideChannel())
}
