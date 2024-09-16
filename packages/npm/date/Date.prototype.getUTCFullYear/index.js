'use strict'

const impl = require('./implementation')

module.exports = function getUTCFullYear(date) {
  return new.target ? new impl() : Reflect.apply(impl, date, [])
}
