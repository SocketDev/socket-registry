'use strict'

const impl = require('./implementation')

module.exports = function getFullYear(date) {
  return new.target ? new impl() : Reflect.apply(impl, date, [])
}
