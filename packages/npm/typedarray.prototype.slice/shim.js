'use strict'

const impl = require('./implementation')

module.exports = function shimTypedArrayProtoSlice() {
  return impl
}