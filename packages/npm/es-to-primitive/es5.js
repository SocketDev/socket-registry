'use strict'

const { toString: objToStr } = Object.prototype

function defaultValue(O, actualHint) {
  if (actualHint === String || actualHint === Number) {
    const methods =
      actualHint === String ? ['toString', 'valueOf'] : ['valueOf', 'toString']
    for (let i = 0; i < methods.length; i += 1) {
      const method = O[methods[i]]
      if (typeof method === 'function') {
        const value = method.call(O)
        if (isPrimitive(value)) {
          return value
        }
      }
    }
    throw new TypeError('No default value')
  }
  throw new TypeError('invalid [[DefaultValue]] hint supplied')
}

function isPrimitive(value) {
  return (
    value === null || (typeof value !== 'object' && typeof value !== 'function')
  )
}

module.exports = function ToPrimitive(input) {
  if (isPrimitive(input)) {
    return input
  }
  if (arguments.length > 1) {
    return defaultValue(input, arguments[1])
  }
  return defaultValue(
    input,
    objToStr.call(input) === '[object Date]' ? String : Number,
  )
}
