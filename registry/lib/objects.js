'use strict'

const { LOOP_SENTINEL } = require('./constants')
const { localeCompare } = require('./sorts')

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

function hasOwn(obj, propKey) {
  if (obj === null || obj === undefined) {
    return false
  }
  return Object.hasOwn(obj, propKey)
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function isObjectObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function merge(target, source) {
  if (!isObject(target) || !isObject(source)) {
    return target
  }
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

function toSortedObject(obj) {
  return toSortedObjectFromEntries(objectEntries(obj))
}

function toSortedObjectFromEntries(entries) {
  return objectFromEntries(entries.sort((a, b) => localeCompare(a[0], b[0])))
}

module.exports = {
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