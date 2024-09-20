'use strict'

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

module.exports = {
  isNonEmptyString
}
