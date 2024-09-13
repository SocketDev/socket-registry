'use strict'

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
  if (Array.isArray(target)) {
    if (Array.isArray(source)) {
      for (const item of source) {
        if (!target.includes(item)) {
          target.push(item)
        }
      }
    }
    return target
  }
  if (Array.isArray(source)) {
    return target
  }
  for (const { 0: key, 1: srcVal } of Object.entries(source)) {
    if (Object.hasOwn(target, key)) {
      const targetVal = target[key]
      if (Array.isArray(srcVal)) {
        const srcArr = srcVal
        if (Array.isArray(targetVal)) {
          const targetArr = targetVal
          for (const item of srcArr) {
            if (!targetArr.includes(item)) {
              targetArr.push(item)
            }
          }
        } else {
          target[key] = srcVal
        }
      } else if (isObject(srcVal)) {
        const srcObj = srcVal
        if (isObject(targetVal) && !Array.isArray(targetVal)) {
          const targetObj = targetVal
          for (const { 0: srcObjKey, 1: srcObjVal } of Object.entries(srcObj)) {
            const targetObjVal = targetObj[srcObjKey]
            if (
              (Array.isArray(targetObjVal) || isObject(targetObjVal)) &&
              (Array.isArray(srcObjVal) || isObject(srcObjVal))
            ) {
              targetObj[srcObjKey] = merge(targetObjVal, srcObjVal)
            } else {
              targetObj[srcObjKey] = srcObjVal
            }
          }
        } else {
          target[key] = srcVal
        }
      } else {
        target[key] = srcVal
      }
    } else {
      target[key] = srcVal
    }
  }
  return target
}

module.exports = {
  isObject,
  isObjectObject,
  merge
}
