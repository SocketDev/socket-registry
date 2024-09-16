'use strict'

const impl = require('./implementation')

module.exports = function toJSON(date) {
  return new.target ? new impl() : Reflect.apply(impl, date, [])
}
