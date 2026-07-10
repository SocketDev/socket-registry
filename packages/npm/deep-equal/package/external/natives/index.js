'use strict'

// Native-API helpers for the portable deep-equal implementation in
// ../../index.js. On the Node>=24 baseline (and every modern browser this
// portable branch targets) the es-shims the algorithm used to require are all
// native, so each is inlined here to the subset of behavior the algorithm
// needs. Type checks use internal-slot probes (a prototype getter / method
// called on the value, which throws for the wrong receiver) rather than
// Object.prototype.toString tags, so they resist Symbol.toStringTag spoofing the
// way the shims did. Kept in external/ alongside the vendored port so the port
// itself stays a faithful, minimally-edited copy of upstream.

const assign = Object.assign
const objectKeys = Object.keys
const is = Object.is
const isArray = Array.isArray
const gPO = Object.getPrototypeOf

const objectProtoToString = Object.prototype.toString
function $objToString(value) {
  return objectProtoToString.call(value)
}

const dateProtoGetTime = Date.prototype.getTime
function $getTime(value) {
  return dateProtoGetTime.call(value)
}

const $Set = typeof Set === 'function' ? Set : undefined

const mapProtoHas = Map.prototype.has
const mapProtoGet = Map.prototype.get
const mapSizeGetter = Object.getOwnPropertyDescriptor(Map.prototype, 'size').get
const setProtoHas = Set.prototype.has
const setProtoAdd = Set.prototype.add
const setProtoDelete = Set.prototype.delete
const setSizeGetter = Object.getOwnPropertyDescriptor(Set.prototype, 'size').get
const weakMapProtoHas =
  typeof WeakMap === 'function' ? WeakMap.prototype.has : undefined
const weakSetProtoHas =
  typeof WeakSet === 'function' ? WeakSet.prototype.has : undefined

function $mapHas(map, key) {
  return mapProtoHas.call(map, key)
}
function $mapGet(map, key) {
  return mapProtoGet.call(map, key)
}
function $mapSize(map) {
  return mapSizeGetter.call(map)
}
function $setAdd(set, value) {
  return setProtoAdd.call(set, value)
}
function $setDelete(set, value) {
  return setProtoDelete.call(set, value)
}
function $setHas(set, value) {
  return setProtoHas.call(set, value)
}
function $setSize(set) {
  return setSizeGetter.call(set)
}

const arrayBufferByteLengthGetter = Object.getOwnPropertyDescriptor(
  ArrayBuffer.prototype,
  'byteLength',
).get
const sharedArrayBufferByteLengthGetter =
  typeof SharedArrayBuffer === 'function'
    ? Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'byteLength')
        .get
    : undefined
const regexpSourceGetter = Object.getOwnPropertyDescriptor(
  RegExp.prototype,
  'source',
).get

function byteLength(value) {
  return arrayBufferByteLengthGetter.call(value)
}
function sabByteLength(value) {
  return sharedArrayBufferByteLengthGetter.call(value)
}
function flags(value) {
  return value.flags
}
function getIterator(value) {
  return value[Symbol.iterator]()
}
function getSideChannel() {
  // Cycle-detection memo, keyed by the values being compared. Keys can be
  // primitives (comparing a primitive against an object touches the channel
  // before either is ruled out), so object keys go in a WeakMap and primitives
  // in a Map — matching the side-channel package this replaced. A bare WeakMap
  // throws "Invalid value used as weak map key" on a primitive key.
  const objects = new WeakMap()
  const primitives = new Map()
  function bucket(key) {
    return key !== null &&
      (typeof key === 'object' || typeof key === 'function')
      ? objects
      : primitives
  }
  return {
    has(key) {
      return bucket(key).has(key)
    },
    get(key) {
      return bucket(key).get(key)
    },
    set(key, value) {
      bucket(key).set(key, value)
    },
  }
}
function isArguments(value) {
  return $objToString(value) === '[object Arguments]'
}
function isDate(value) {
  if (!value || typeof value !== 'object') {
    return false
  }
  try {
    $getTime(value)
    return true
  } catch {
    return false
  }
}
function isRegex(value) {
  if (!value || typeof value !== 'object') {
    return false
  }
  try {
    regexpSourceGetter.call(value)
    return true
  } catch {
    return false
  }
}
function isArrayBuffer(value) {
  if (!value || typeof value !== 'object') {
    return false
  }
  try {
    arrayBufferByteLengthGetter.call(value)
    return true
  } catch {
    return false
  }
}
function isSharedArrayBuffer(value) {
  if (
    !sharedArrayBufferByteLengthGetter ||
    !value ||
    typeof value !== 'object'
  ) {
    return false
  }
  try {
    sharedArrayBufferByteLengthGetter.call(value)
    return true
  } catch {
    return false
  }
}
function whichBoxedPrimitive(value) {
  if (value === null || typeof value !== 'object') {
    return undefined
  }
  const tag = $objToString(value)
  if (tag === '[object String]') {
    return 'String'
  }
  if (tag === '[object Number]') {
    return 'Number'
  }
  if (tag === '[object Boolean]') {
    return 'Boolean'
  }
  if (tag === '[object Symbol]') {
    return 'Symbol'
  }
  if (tag === '[object BigInt]') {
    return 'BigInt'
  }
  return undefined
}
function whichTypedArray(value) {
  if (!ArrayBuffer.isView(value)) {
    return false
  }
  const tag = $objToString(value)
  return tag === '[object DataView]' ? false : tag
}
function whichCollection(value) {
  if (value === null || typeof value !== 'object') {
    return undefined
  }
  try {
    setProtoHas.call(value, undefined)
    return 'Set'
  } catch {}
  try {
    mapProtoHas.call(value, undefined)
    return 'Map'
  } catch {}
  if (weakSetProtoHas) {
    try {
      weakSetProtoHas.call(value, whichCollection)
      return 'WeakSet'
    } catch {}
  }
  if (weakMapProtoHas) {
    try {
      weakMapProtoHas.call(value, whichCollection)
      return 'WeakMap'
    } catch {}
  }
  return undefined
}

module.exports = {
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
}
