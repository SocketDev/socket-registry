'use strict'

const { isRegExpProtoFlagsOrderBuggy } = require('./shared')

const flagsGetter = RegExp.prototype.__lookupGetter__('flags')

module.exports = !isRegExpProtoFlagsOrderBuggy(flagsGetter)
  ? flagsGetter
  : {
      get flags() {
        if (new.target || this === null || typeof this !== 'object') {
          // Defer to builtin flags getter for the error case.
          return flagsGetter.call(this)
        }
        // Flag check order defined as hasIndices, global, ignoreCase, multiline,
        // dotAll, unicode, unicodeSets, and sticky.
        // https://tc39.es/ecma262/#sec-get-regexp.prototype.flags
        let result = ''
        if (this.hasIndices) {
          result += 'd'
        }
        if (this.global) {
          result += 'g'
        }
        if (this.ignoreCase) {
          result += 'i'
        }
        if (this.multiline) {
          result += 'm'
        }
        if (this.dotAll) {
          result += 's'
        }
        if (this.unicode) {
          result += 'u'
        }
        if (this.unicodeSets) {
          result += 'v'
        }
        if (this.sticky) {
          result += 'y'
        }
        return result
      }
    }.__lookupGetter__('flags')
