'use strict'

const { isFinite: NumberIsFinite, parseInt: NumberParseInt } = Number

/*@__NO_SIDE_EFFECTS__*/
function envAsBoolean(value) {
  return typeof value === 'string'
    ? value.trim() === '1' || value.trim().toLowerCase() === 'true'
    : !!value
}

/*@__NO_SIDE_EFFECTS__*/
function envAsNumber(value) {
  const numOrNaN = NumberParseInt(value, 10)
  const numMayBeNegZero = NumberIsFinite(numOrNaN) ? numOrNaN : 0
  // Ensure -0 is treated as 0.
  return numMayBeNegZero || 0
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
  envAsNumber,
  envAsString
}
