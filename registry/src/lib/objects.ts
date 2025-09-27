/**
 * @fileoverview Object manipulation and reflection utilities.
 * Provides type-safe object operations, property access, and structural helpers.
 */
'use strict'

const { isArray: ArrayIsArray } = Array
const {
  defineProperties: ObjectDefineProperties,
  defineProperty: ObjectDefineProperty,
  freeze: ObjectFreeze,
  fromEntries: ObjectFromEntries,
  getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors,
  getOwnPropertyNames: ObjectGetOwnPropertyNames,
  getPrototypeOf: ObjectGetPrototypeOf,
  hasOwn: ObjectHasOwn,
  keys: ObjectKeys,
  prototype: ObjectPrototype,
  setPrototypeOf: ObjectSetPrototypeOf,
} = Object
const { __defineGetter__ } = Object.prototype
const { ownKeys: ReflectOwnKeys } = Reflect

/**
 * Create a lazy getter function that memoizes its result.
 */
/*@__NO_SIDE_EFFECTS__*/
function createLazyGetter(name, getter, stats) {
  const UNDEFINED_TOKEN = /*@__PURE__*/ require('./constants/UNDEFINED_TOKEN')
  let lazyValue = UNDEFINED_TOKEN
  // Dynamically name the getter without using Object.defineProperty.
  const { [name]: lazyGetter } = {
    [name]() {
      if (lazyValue === UNDEFINED_TOKEN) {
        stats?.initialized?.add(name)
        lazyValue = getter()
      }
      return lazyValue
    },
  }
  return lazyGetter
}

/**
 * Create a frozen constants object with lazy getters and internal properties.
 */
/*@__NO_SIDE_EFFECTS__*/
function createConstantsObject(props, options_) {
  const options = { __proto__: null, ...options_ }
  const attributes = ObjectFreeze({
    __proto__: null,
    getters: options.getters
      ? ObjectFreeze(
          ObjectSetPrototypeOf(toSortedObject(options.getters), null),
        )
      : undefined,
    internals: options.internals
      ? ObjectFreeze(
          ObjectSetPrototypeOf(toSortedObject(options.internals), null),
        )
      : undefined,
    mixin: options.mixin
      ? ObjectFreeze(
          ObjectDefineProperties(
            { __proto__: null },
            ObjectGetOwnPropertyDescriptors(options.mixin),
          ),
        )
      : undefined,
    props: props
      ? ObjectFreeze(ObjectSetPrototypeOf(toSortedObject(props), null))
      : undefined,
  })
  const kInternalsSymbol = /*@__PURE__*/ require('./constants/k-internals-symbol')
  const lazyGetterStats = ObjectFreeze({
    __proto__: null,
    initialized: new Set(),
  })
  const object = defineLazyGetters(
    {
      __proto__: null,
      [kInternalsSymbol]: ObjectFreeze({
        __proto__: null,
        get attributes() {
          return attributes
        },
        get lazyGetterStats() {
          return lazyGetterStats
        },
        ...attributes.internals,
      }),
      kInternalsSymbol,
      ...attributes.props,
    },
    attributes.getters,
    lazyGetterStats,
  )
  if (attributes.mixin) {
    ObjectDefineProperties(
      object,
      toSortedObjectFromEntries(
        objectEntries(ObjectGetOwnPropertyDescriptors(attributes.mixin)).filter(
          p => !ObjectHasOwn(object, p[0]),
        ),
      ),
    )
  }
  return ObjectFreeze(object)
}

/**
 * Define a getter property on an object.
 */
/*@__NO_SIDE_EFFECTS__*/
function defineGetter(object, propKey, getter) {
  ObjectDefineProperty(object, propKey, {
    get: getter,
    enumerable: false,
    configurable: true,
  })
  return object
}

/**
 * Define a lazy getter property on an object.
 */
/*@__NO_SIDE_EFFECTS__*/
function defineLazyGetter(object, propKey, getter, stats) {
  return defineGetter(object, propKey, createLazyGetter(propKey, getter, stats))
}

/**
 * Define multiple lazy getter properties on an object.
 */
/*@__NO_SIDE_EFFECTS__*/
function defineLazyGetters(object, getterDefObj, stats) {
  if (getterDefObj !== null && typeof getterDefObj === 'object') {
    const keys = ReflectOwnKeys(getterDefObj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      defineLazyGetter(
        object,
        key,
        createLazyGetter(key, getterDefObj[key], stats),
      )
    }
  }
  return object
}

let _localeCompare
/**
 * Compare two entry arrays by their keys for sorting.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function entryKeyComparator(a, b) {
  if (_localeCompare === undefined) {
    const sorts = /*@__PURE__*/ require('./sorts')
    _localeCompare = sorts.localeCompare
  }
  const keyA = a[0]
  const keyB = b[0]
  const strKeyA = typeof keyA === 'string' ? keyA : String(keyA)
  const strKeyB = typeof keyB === 'string' ? keyB : String(keyB)
  return _localeCompare(strKeyA, strKeyB)
}

/**
 * Get the enumerable own property keys of an object.
 */
/*@__NO_SIDE_EFFECTS__*/
function getKeys(obj) {
  return isObject(obj) ? ObjectKeys(obj) : []
}

/**
 * Get an own property value from an object safely.
 */
/*@__NO_SIDE_EFFECTS__*/
function getOwn(obj, propKey) {
  if (obj === null || obj === undefined) {
    return undefined
  }
  return ObjectHasOwn(obj, propKey) ? obj[propKey] : undefined
}

/**
 * Get all own property values from an object.
 */
/*@__NO_SIDE_EFFECTS__*/
function getOwnPropertyValues(obj) {
  if (obj === null || obj === undefined) {
    return []
  }
  const keys = ObjectGetOwnPropertyNames(obj)
  const { length } = keys
  const values = Array(length)
  for (let i = 0; i < length; i += 1) {
    values[i] = obj[keys[i]]
  }
  return values
}

/**
 * Check if an object has any enumerable own properties.
 */
/*@__NO_SIDE_EFFECTS__*/
function hasKeys(obj) {
  if (obj === null || obj === undefined) {
    return false
  }
  for (const key in obj) {
    if (ObjectHasOwn(obj, key)) {
      return true
    }
  }
  return false
}

/**
 * Check if an object has an own property.
 */
/*@__NO_SIDE_EFFECTS__*/
function hasOwn(obj, propKey) {
  if (obj === null || obj === undefined) {
    return false
  }
  return ObjectHasOwn(obj, propKey)
}

/**
 * Check if a value is an object (including arrays).
 */
/*@__NO_SIDE_EFFECTS__*/
function isObject(value) {
  return value !== null && typeof value === 'object'
}

/**
 * Check if a value is a plain object (not an array, not a built-in).
 */
/*@__NO_SIDE_EFFECTS__*/
function isObjectObject(value) {
  if (value === null || typeof value !== 'object' || ArrayIsArray(value)) {
    return false
  }
  const proto = ObjectGetPrototypeOf(value)
  return proto === null || proto === ObjectPrototype
}

/**
 * Get all own property entries (key-value pairs) from an object.
 */
/*@__NO_SIDE_EFFECTS__*/
function objectEntries(obj) {
  if (obj === null || obj === undefined) {
    return []
  }
  const keys = ReflectOwnKeys(obj)
  const { length } = keys
  const entries = Array(length)
  for (let i = 0; i < length; i += 1) {
    const key = keys[i]
    entries[i] = [key, obj[key]]
  }
  return entries
}

/**
 * Deep merge source object into target object.
 */
/*@__NO_SIDE_EFFECTS__*/
function merge(target, source) {
  if (!isObject(target) || !isObject(source)) {
    return target
  }
  const LOOP_SENTINEL = /*@__PURE__*/ require('./constants/LOOP_SENTINEL')
  const queue = [[target, source]]
  let pos = 0
  let { length: queueLength } = queue
  while (pos < queueLength) {
    if (pos === LOOP_SENTINEL) {
      throw new Error('Detected infinite loop in object crawl of merge')
    }
    const { 0: currentTarget, 1: currentSource } = queue[pos++]
    const isSourceArray = ArrayIsArray(currentSource)
    const isTargetArray = ArrayIsArray(currentTarget)

    // Skip array merging - arrays in source replace arrays in target
    if (isSourceArray || isTargetArray) {
      continue
    }
    const keys = ReflectOwnKeys(currentSource)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      const srcVal = currentSource[key]
      const targetVal = currentTarget[key]
      if (ArrayIsArray(srcVal)) {
        // Replace arrays entirely
        currentTarget[key] = srcVal
      } else if (isObject(srcVal)) {
        if (isObject(targetVal) && !ArrayIsArray(targetVal)) {
          queue[queueLength++] = [targetVal, srcVal]
        } else {
          currentTarget[key] = srcVal
        }
      } else {
        currentTarget[key] = srcVal
      }
    }
  }
  return target
}

/**
 * Convert an object to a new object with sorted keys.
 */
/*@__NO_SIDE_EFFECTS__*/
function toSortedObject(obj) {
  return toSortedObjectFromEntries(objectEntries(obj))
}

/**
 * Create an object from entries with sorted keys.
 */
/*@__NO_SIDE_EFFECTS__*/
function toSortedObjectFromEntries(entries) {
  const otherEntries = []
  const symbolEntries = []
  // Use for-of to work with entries iterators.
  for (const entry of entries) {
    if (typeof entry[0] === 'symbol') {
      symbolEntries.push(entry)
    } else {
      otherEntries.push(entry)
    }
  }
  if (!otherEntries.length && !symbolEntries.length) {
    return {}
  }
  return ObjectFromEntries([
    // The String constructor is safe to use with symbols.
    ...symbolEntries.sort(entryKeyComparator),
    ...otherEntries.sort(entryKeyComparator),
  ])
}

module.exports = {
  createConstantsObject,
  createLazyGetter,
  defineGetter,
  defineLazyGetter,
  defineLazyGetters,
  entryKeyComparator,
  getKeys,
  getOwn,
  getOwnPropertyValues,
  hasKeys,
  hasOwn,
  isObject,
  isObjectObject,
  merge,
  objectEntries,
  toSortedObject,
  toSortedObjectFromEntries,
}
