'use strict'

const impl = require('./implementation')

module.exports = function getPolyfill() {
  const { groupBy: ObjectGroupBy } = Object
  return typeof ObjectGroupBy === 'function' ? ObjectGroupBy : impl
}
