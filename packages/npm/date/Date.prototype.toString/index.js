'use strict'

const impl = require('./implementation')

module.exports = function toString(date) {
  return new.target ? new impl() : Reflect.apply(impl, date, [])
}
