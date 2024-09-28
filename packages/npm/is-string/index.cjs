'use strict'

const { isStringObject } = require('node:util/types')

module.exports = function isString(value) {
  return typeof value === 'string' || isStringObject(value)
}
