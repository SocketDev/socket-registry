'use strict'

const impl = require('./implementation')

module.exports = function shimGlobalThis() {
  return impl
}
