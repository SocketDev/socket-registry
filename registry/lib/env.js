'use strict'

/*@__NO_SIDE_EFFECTS__*/
function envAsBoolean(value) {
  return typeof value === 'string'
    ? value === '1' || value.toLowerCase() === 'true'
    : !!value
}

/*@__NO_SIDE_EFFECTS__*/
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
