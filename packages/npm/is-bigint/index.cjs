'use strict'

const { isBigIntObject } = require('node:util/types')

module.exports = function isBigInt(value) {
  return typeof value === 'bigint' || isBigIntObject(value)
}
