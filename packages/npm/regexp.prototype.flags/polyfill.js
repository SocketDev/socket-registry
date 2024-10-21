'use strict'

const impl = require('./implementation')
const { isRegExpProtoFlagsOrderBuggy } = require('./shared')

module.exports = function getPolyfill() {
  const flagsGetter = RegExp.prototype.__lookupGetter__('flags')
  return isRegExpProtoFlagsOrderBuggy(flagsGetter) ? impl : flagsGetter
}
