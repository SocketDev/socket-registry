'use strict'

module.exports = function isSymbol(value) {
  return (
    typeof value === 'symbol' ||
    (value !== null &&
      typeof value === 'object' &&
      Object.prototype.toString.call(value) === '[object Symbol]')
  )
}
