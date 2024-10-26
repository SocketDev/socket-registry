'use strict'

const impl = require('./implementation')
const {
  IteratorPrototype,
  isIteratorProtoNextCheckBuggy
} = require('../shared')

module.exports = function getPolyfill() {
  const { flatMap } = IteratorPrototype
  return typeof flatMap !== 'function' ||
    isIteratorProtoNextCheckBuggy(flatMap, () => {})
    ? impl
    : flatMap
}
