'use strict'

const impl = require('./implementation')
const {
  IteratorPrototype,
  isIteratorProtoNextCheckBuggy
} = require('../shared')

module.exports = function getPolyfill() {
  const { filter } = IteratorPrototype
  return typeof filter !== 'function' ||
    isIteratorProtoNextCheckBuggy(filter, () => {})
    ? impl
    : filter
}
