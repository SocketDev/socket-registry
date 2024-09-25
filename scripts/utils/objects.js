'use strict'

const { LOOP_SENTINEL } = require('@socketregistry/scripts/constants')

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

module.exports = {
  isObjectObject,
  merge
}
