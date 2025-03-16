'use strict'

const { __defineGetter__ } = Object.prototype

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
function createConstantsObject(props, options) {
  const {
    getters = {},
    internals = {},
    mixin
  } = { __proto__: null, ...options }
  const kInternalsSymbol = /*@__PURE__*/ require('./constants/k-internals-symbol')
  const lazyGetterStats = { initialized: new Set() }
  const object = defineLazyGetters(
    {
      __proto__: null,
      [kInternalsSymbol]: Object.freeze({
        __proto__: null,
        get lazyGetterStats() {
          return lazyGetterStats
        },
        ...internals
      }),
      kInternalsSymbol,
      ...props
    },
    getters,
    lazyGetterStats
  )
  if (mixin) {
    Object.defineProperties(
      object,
      objectFromEntries(
        objectEntries(Object.getOwnPropertyDescriptors(mixin)).filter(
          p => !Object.hasOwn(object, p[0])
        )
      )
    )
  }
  return Object.freeze(object)
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
    const keys = Reflect.ownKeys(getterDefObj)
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

/*@__NO_SIDE_EFFECTS__*/
function getOwnPropertyValues(obj) {
  if (obj === null || obj === undefined) {
    return []
  }
  const keys = Object.getOwnPropertyNames(obj)
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
    if (Object.hasOwn(obj, key)) {
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
  return Object.hasOwn(obj, propKey)
}

/*@__NO_SIDE_EFFECTS__*/
function isObject(value) {
  return value !== null && typeof value === 'object'
}

/*@__NO_SIDE_EFFECTS__*/
function isObjectObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/*@__NO_SIDE_EFFECTS__*/
function objectEntries(obj) {
  if (obj === null || obj === undefined) {
    return []
  }
  const entries = Object.entries(obj)
  const symbols = Object.getOwnPropertySymbols(obj)
  for (let i = 0, { length } = symbols; i < length; i += 1) {
    const symbol = symbols[i]
    entries.push([symbol, obj[symbol]])
  }
  return entries
}

/*@__NO_SIDE_EFFECTS__*/
function objectFromEntries(entries) {
  const keyEntries = []
  const symbolEntries = []
  for (let i = 0, { length } = entries; i < length; i += 1) {
    const entry = entries[i]
    if (typeof entry[0] === 'symbol') {
      symbolEntries.push(entry)
    } else {
      keyEntries.push(entry)
    }
  }
  const object = Object.fromEntries(keyEntries)
  for (let i = 0, { length } = symbolEntries; i < length; i += 1) {
    const entry = symbolEntries[i]
    object[entry[0]] = entry[1]
  }
  return object
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
    const isSourceArray = Array.isArray(currentSource)
    if (Array.isArray(currentTarget)) {
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
    const keys = Reflect.ownKeys(currentSource)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      const srcVal = currentSource[key]
      const targetVal = currentTarget[key]
      if (Array.isArray(srcVal)) {
        if (Array.isArray(targetVal)) {
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
        if (isObject(targetVal) && !Array.isArray(targetVal)) {
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
  const { localeCompare } = /*@__PURE__*/ require('./sorts')
  return objectFromEntries(entries.sort((a, b) => localeCompare(a[0], b[0])))
}

module.exports = {
  createConstantsObject,
  createLazyGetter,
  defineGetter,
  defineLazyGetter,
  defineLazyGetters,
  getOwnPropertyValues,
  hasKeys,
  hasOwn,
  isObject,
  isObjectObject,
  merge,
  objectEntries,
  objectFromEntries,
  toSortedObject,
  toSortedObjectFromEntries
}
