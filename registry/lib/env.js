'use strict'

/*@__NO_SIDE_EFFECTS__*/
function envAsBoolean(value) {
  return typeof value === 'string'
    ? value.trim() === '1' || value.trim().toLowerCase() === 'true'
    : !!value
}

/*@__NO_SIDE_EFFECTS__*/
function envAsString(value) {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value === null || value === undefined) {
    return ''
  }
  return String(value).trim()
}

module.exports = {
  envAsBoolean,
  envAsString
}
