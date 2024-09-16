'use strict'

const impl = require('./implementation')

module.exports = function toDateString(date) {
  return new.target ? new impl() : Reflect.apply(impl, date, [])
}
