'use strict'

const impl = require('./implementation')
const IteratorPrototype = require('../Iterator.prototype/implementation')
const { isIteratorNextCheckBuggy } = require('../shared')

module.exports = function getPolyfill() {
  return isIteratorNextCheckBuggy(IteratorPrototype, 'drop', 0)
    ? impl
    : IteratorPrototype.drop
}
