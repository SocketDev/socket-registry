'use strict'

const impl = require('./implementation')

const keysShim = function keys(object) {
  return new.target ? new impl() : impl(object)
}
keysShim.shim = function shimObjectKeys() {
  if (Object.keys !== impl) {
    Object.keys = impl
  }
  return impl
}
module.exports = keysShim
