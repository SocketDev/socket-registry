'use strict'

const {
  $getTime,
  $objToString,
  byteLength,
  flags,
  gPO,
  isArguments,
  isArray,
  isArrayBuffer,
  isDate,
  isRegex,
  isSharedArrayBuffer,
  sabByteLength,
  whichTypedArray,
} = require('./external/natives')

function arrayBufferEquiv(a, b, options, channel, compare) {
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
      compare(new Uint8Array(a), new Uint8Array(b), options, channel)
    )
  }
}

function binaryObjectEquiv(a, b, options, channel, compare) {
  let result = typedArrayEquiv(a, b)
  if (result !== undefined) {
    return result
  }
  result = bufferEquiv(a, b)
  if (result !== undefined) {
    return result
  }
  result = arrayBufferEquiv(a, b, options, channel, compare)
  if (result !== undefined) {
    return result
  }
  return sharedArrayBufferEquiv(a, b, options, channel, compare)
}

function bufferEquiv(a, b) {
  let i
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

function sameDateType(a, b) {
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
  return true
}

function sameErrorType(a, b) {
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

  return true
}

function sameObjectShape(a, b) {
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

  return true
}

function sameObjectTypes(a, b, strict) {
  if (!sameObjectShape(a, b)) {
    return false
  }
  if (!sameErrorType(a, b)) {
    return false
  }
  if (!sameRegExpType(a, b)) {
    return false
  }
  if (!sameDateType(a, b)) {
    return false
  }
  if (strict && gPO && gPO(a) !== gPO(b)) {
    return false
  }

  return true
}

function sameRegExpType(a, b) {
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

  return true
}

function sharedArrayBufferEquiv(a, b, options, channel, compare) {
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
      compare(new Uint8Array(a), new Uint8Array(b), options, channel)
    )
  }
}

function typedArrayEquiv(a, b) {
  let i
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
}

module.exports = { binaryObjectEquiv, sameObjectTypes }
