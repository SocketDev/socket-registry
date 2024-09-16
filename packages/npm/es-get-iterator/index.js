'use strict'

module.exports = function getIterator(iterable) {
  return iterable?.[Symbol.iterator]?.()
}
