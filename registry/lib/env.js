'use strict'

function envAsBoolean(value) {
  return typeof value === 'string'
    ? value === '1' || value.toLowerCase() === 'true'
    : !!value
}

function envAsString(value) {
  if (typeof value === 'string') {
    return value
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value)
}

module.exports = {
  envAsBoolean,
  envAsString
}
