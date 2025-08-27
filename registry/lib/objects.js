'use strict'

const { isArray: ArrayIsArray } = Array
const {
  defineProperties: ObjectDefineProperties,
  freeze: ObjectFreeze,
  fromEntries: ObjectFromEntries,
  getOwnPropertyDescriptors: ObjectGetOwnPropertyDescriptors,
  getOwnPropertyNames: ObjectGetOwnPropertyNames,
  hasOwn: ObjectHasOwn,
  keys: ObjectKeys,
  setPrototypeOf: ObjectSetPrototypeOf
} = Object
const { __defineGetter__ } = Object.prototype
const { ownKeys: ReflectOwnKeys } = Reflect

/*@__NO_SIDE_EFFECTS__*/
function createLazyGetter(name, getter, stats) {
  const UNDEFINED_TOKEN = /*@__PURE__*/ require('./constants/undefined-token')
  let lazyValue = UNDEFINED_TOKEN
  // Dynamically name the getter without using Object.defineProperty.
  const { [name]: lazyGetter } = {
    [name]() {
      if (lazyValue === UNDEFINED_TOKEN) {
        stats?.initialized?.add(name)
        lazyValue = getter()
      }
      return lazyValue
    }
  }
  return lazyGetter
}

/*@__NO_SIDE_EFFECTS__*/
function createConstantsObject(props, options_) {
  const options = { __proto__: null, ...options_ }
  const attributes = ObjectFreeze({
    __proto__: null,
    getters: options.getters
      ? ObjectFreeze(
          ObjectSetPrototypeOf(toSortedObject(options.getters), null)
        )
      : undefined,
    internals: options.internals
      ? ObjectFreeze(
          ObjectSetPrototypeOf(toSortedObject(options.internals), null)
        )
      : undefined,
    mixin: options.mixin
      ? ObjectFreeze(
          ObjectDefineProperties(
            { __proto__: null },
            ObjectGetOwnPropertyDescriptors(options.mixin)
          )
        )
      : undefined,
    props: props
      ? ObjectFreeze(ObjectSetPrototypeOf(toSortedObject(props), null))
      : undefined
  })
  const kInternalsSymbol = /*@__PURE__*/ require('./constants/k-internals-symbol')
  const lazyGetterStats = ObjectFreeze({
    __proto__: null,
    initialized: new Set()
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
        ...attributes.internals
      }),
      kInternalsSymbol,
      ...attributes.props
    },
    attributes.getters,
    lazyGetterStats
  )
  if (attributes.mixin) {
    ObjectDefineProperties(
      object,
      toSortedObjectFromEntries(
        objectEntries(ObjectGetOwnPropertyDescriptors(attributes.mixin)).filter(
          p => !ObjectHasOwn(object, p[0])
        )
      )
    )
  }
  return ObjectFreeze(object)
}

/*@__NO_SIDE_EFFECTS__*/
function defineGetter(object, propKey, getter) {
  __defineGetter__.call(object, propKey, getter)
  return object
}

/*@__NO_SIDE_EFFECTS__*/
function defineLazyGetter(object, propKey, getter, stats) {
  return defineGetter(object, propKey, createLazyGetter(propKey, getter, stats))
}

/*@__NO_SIDE_EFFECTS__*/
function defineLazyGetters(object, getterDefObj, stats) {
  if (getterDefObj !== null && typeof getterDefObj === 'object') {
    const keys = ReflectOwnKeys(getterDefObj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      defineLazyGetter(
        object,
        key,
        createLazyGetter(key, getterDefObj[key], stats)
      )
    }
  }
  return object
}

let _localeCompare
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

/*@__NO_SIDE_EFFECTS__*/
function getKeys(obj) {
  return isObject(obj) ? ObjectKeys(obj) : []
}

/*@__NO_SIDE_EFFECTS__*/
function getOwn(obj, propKey) {
  if (obj === null || obj === undefined) {
    return undefined
  }
  return ObjectHasOwn(obj, propKey) ? obj[propKey] : undefined
}

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

/*@__NO_SIDE_EFFECTS__*/
function hasOwn(obj, propKey) {
  if (obj === null || obj === undefined) {
    return false
  }
  return ObjectHasOwn(obj, propKey)
}

/*@__NO_SIDE_EFFECTS__*/
function isObject(value) {
  return value !== null && typeof value === 'object'
}

/*@__NO_SIDE_EFFECTS__*/
function isObjectObject(value) {
  return value !== null && typeof value === 'object' && !ArrayIsArray(value)
}

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

/*@__NO_SIDE_EFFECTS__*/
function merge(target, source) {
  if (!isObject(target) || !isObject(source)) {
    return target
  }
  const LOOP_SENTINEL = /*@__PURE__*/ require('./constants/loop-sentinel')
  const queue = [[target, source]]
  let pos = 0
  let { length: queueLength } = queue
  while (pos < queueLength) {
    if (pos === LOOP_SENTINEL) {
      throw new Error('Detected infinite loop in object crawl of merge')
    }
    const { 0: currentTarget, 1: currentSource } = queue[pos++]
    const isSourceArray = ArrayIsArray(currentSource)
    if (ArrayIsArray(currentTarget)) {
      if (isSourceArray) {
        const seen = new Set(currentTarget)
        for (let i = 0, { length } = currentSource; i < length; i += 1) {
          const item = currentSource[i]
          if (!seen.has(item)) {
            currentTarget.push(item)
            seen.add(item)
          }
        }
      }
      continue
    }
    if (isSourceArray) {
      continue
    }
    const keys = ReflectOwnKeys(currentSource)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      const srcVal = currentSource[key]
      const targetVal = currentTarget[key]
      if (ArrayIsArray(srcVal)) {
        if (ArrayIsArray(targetVal)) {
          const seen = new Set(targetVal)
          for (let i = 0, { length } = srcVal; i < length; i += 1) {
            const item = srcVal[i]
            if (!seen.has(item)) {
              targetVal.push(item)
              seen.add(item)
            }
          }
        } else {
          currentTarget[key] = srcVal
        }
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

/*@__NO_SIDE_EFFECTS__*/
function toSortedObject(obj) {
  return toSortedObjectFromEntries(objectEntries(obj))
}

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
    return []
  }
  return ObjectFromEntries([
    // The String constructor is safe to use with symbols.
    ...symbolEntries.sort(entryKeyComparator),
    ...otherEntries.sort(entryKeyComparator)
  ])
}

module.exports = {
  createConstantsObject,
  createLazyGetter,
  defineGetter,
  defineLazyGetter,
  defineLazyGetters,
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
  toSortedObjectFromEntries
}
