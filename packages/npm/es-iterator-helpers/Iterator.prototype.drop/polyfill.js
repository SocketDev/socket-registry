'use strict'

const impl = require('./implementation')
const {
  IteratorPrototype,
  isIteratorProtoNextCheckBuggy
} = require('../shared')

module.exports = function getPolyfill() {
  const { drop } = IteratorPrototype
  return typeof drop !== 'function' || isIteratorProtoNextCheckBuggy(drop, 0)
    ? impl
    : drop
}
