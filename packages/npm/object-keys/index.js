'use strict'

const impl = require('./implementation')

module.exports = function keys(object) {
  return new.target ? new impl() : impl(object)
}
module.exports.shim = function shimObjectKeys() {
  if (Object.keys !== impl) {
    Object.keys = impl
  }
  return impl
}
