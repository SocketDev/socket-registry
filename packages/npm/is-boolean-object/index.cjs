'use strict'

const { isBooleanObject } = require('node:util/types')

module.exports = function isBoolean(value) {
  return typeof value === 'boolean' || isBooleanObject(value)
}
