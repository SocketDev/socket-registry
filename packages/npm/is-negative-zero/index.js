'use strict'

module.exports = function isNegativeZero(number) {
  return number === 0 && 1 / number === Number.NEGATIVE_INFINITY
}
