'use strict'

const { map: builtinMap } = require('../Iterator.prototype')
const { fixIterator } = require('../shared')

module.exports =
  builtinMap &&
  function map(mapper) {
    if (new.target) {
      throw new TypeError('`map` is not a constructor')
    }
    return Reflect.apply(builtinMap, fixIterator(this), [mapper])
  }
