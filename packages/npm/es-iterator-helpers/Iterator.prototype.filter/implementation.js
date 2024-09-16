'use strict'

const { filter: builtinFilter } = require('../Iterator.prototype')
const { fixIterator } = require('../shared')

module.exports =
  builtinFilter &&
  function filter(predicate) {
    if (new.target) {
      throw new TypeError('`filter` is not a constructor')
    }
    return Reflect.apply(builtinFilter, fixIterator(this), [predicate])
  }
