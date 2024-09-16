'use strict'

const { drop: builtinDrop } = require('../Iterator.prototype')
const { fixIterator } = require('../shared')

module.exports =
  builtinDrop &&
  function drop(limit) {
    if (new.target) {
      throw new TypeError('`drop` is not a constructor')
    }
    return Reflect.apply(builtinDrop, fixIterator(this), [limit])
  }
