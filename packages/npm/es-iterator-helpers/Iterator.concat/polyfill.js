'use strict'

const impl = require('./implementation')
const Iterator = require('../Iterator/implementation')

module.exports = function getPolyfill() {
  return typeof Iterator.concat === 'function' ? Iterator.concat : impl
}
