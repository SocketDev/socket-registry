'use strict'

const { flatMap: builtinFlatMap } = require('../Iterator.prototype')
const { fixIterator } = require('../shared')

module.exports =
  builtinFlatMap &&
  function flatMap(mapper) {
    if (new.target) {
      throw new TypeError('`flatMap` is not a constructor')
    }
    return Reflect.apply(builtinFlatMap, fixIterator(this), [mapper])
  }
