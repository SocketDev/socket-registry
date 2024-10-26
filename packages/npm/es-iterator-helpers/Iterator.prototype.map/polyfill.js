'use strict'

const impl = require('./implementation')
const {
  IteratorPrototype,
  isIteratorProtoNextCheckBuggy
} = require('../shared')

module.exports = function getPolyfill() {
  const { map } = IteratorPrototype
  return typeof map !== 'function' ||
    isIteratorProtoNextCheckBuggy(map, () => {})
    ? impl
    : map
}
