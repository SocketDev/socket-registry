'use strict'

const impl = require('./implementation')
const IteratorPrototype = require('../Iterator.prototype/implementation')
const { isIteratorProtoNextCheckBuggy } = require('../shared')

module.exports = function getPolyfill() {
  return isIteratorProtoNextCheckBuggy(IteratorPrototype, 'filter', () => {})
    ? impl
    : IteratorPrototype.filter
}
