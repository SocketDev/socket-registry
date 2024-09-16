'use strict'

const impl = require('./implementation')

module.exports = function getUTCDate(date) {
  return new.target ? new impl() : Reflect.apply(impl, date, [])
}
