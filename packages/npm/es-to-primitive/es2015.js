'use strict'

const getTime = Date.prototype.getTime
const symbolValueOf = Symbol.prototype.valueOf

function getMethod(O, key) {
  const method = O[key]
  if (method === null || method === undefined) {
    return undefined
  }
  if (typeof method !== 'function') {
    throw new TypeError(`${String(key)} is not a function`)
  }
  return method
}

function isDate(value) {
  try {
    getTime.call(value)
    return true
  } catch {}
  return false
}

function isPrimitive(value) {
  return (
    value === null || (typeof value !== 'object' && typeof value !== 'function')
  )
}

function isSymbolValue(value) {
  if (typeof value === 'symbol') {
    return true
  }
  try {
    symbolValueOf.call(value)
    return typeof value === 'object'
  } catch {}
  return false
}

function ordinaryToPrimitive(O, hint) {
  if (O === undefined || O === null) {
    throw new TypeError(`Cannot call method on ${O}`)
  }
  if (typeof hint !== 'string' || (hint !== 'number' && hint !== 'string')) {
    throw new TypeError('hint must be "string" or "number"')
  }
  const methodNames =
    hint === 'string' ? ['toString', 'valueOf'] : ['valueOf', 'toString']
  for (let i = 0; i < methodNames.length; i += 1) {
    const method = O[methodNames[i]]
    if (typeof method === 'function') {
      const result = method.call(O)
      if (isPrimitive(result)) {
        return result
      }
    }
  }
  throw new TypeError('No default value')
}

module.exports = function ToPrimitive(input) {
  if (isPrimitive(input)) {
    return input
  }
  let hint = 'default'
  if (arguments.length > 1) {
    if (arguments[1] === String) {
      hint = 'string'
    } else if (arguments[1] === Number) {
      hint = 'number'
    }
  }
  const exoticToPrim = getMethod(input, Symbol.toPrimitive)
  if (exoticToPrim !== undefined) {
    const result = exoticToPrim.call(input, hint)
    if (isPrimitive(result)) {
      return result
    }
    throw new TypeError('unable to convert exotic object to primitive')
  }
  if (hint === 'default' && (isDate(input) || isSymbolValue(input))) {
    hint = 'string'
  }
  return ordinaryToPrimitive(input, hint === 'default' ? 'number' : hint)
}
