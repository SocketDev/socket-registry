'use strict'

const flagsGetter = RegExp.prototype.__lookupGetter__('flags')

module.exports = {
  flagsGetter
}
