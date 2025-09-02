'use strict'

const NumberCtor = Number
const { isFinite: NumberIsFinite, parseInt: NumberParseInt } = NumberCtor
const StringCtor = String

/*@__NO_SIDE_EFFECTS__*/
function envAsBoolean(value, defaultValue = false) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '1' || trimmed.toLowerCase() === 'true'
  }
  if (value === null || value === undefined) {
    return !!defaultValue
  }
  return !!value
}

/*@__NO_SIDE_EFFECTS__*/
function envAsNumber(value, defaultValue = 0) {
  const numOrNaN = NumberParseInt(value, 10)
  const numMayBeNegZero = NumberIsFinite(numOrNaN)
    ? numOrNaN
    : NumberCtor(defaultValue)
  // Ensure -0 is treated as 0.
  return numMayBeNegZero || 0
}

/*@__NO_SIDE_EFFECTS__*/
function envAsString(value, defaultValue = '') {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value === null || value === undefined) {
    return defaultValue === '' ? defaultValue : StringCtor(defaultValue).trim()
  }
  return StringCtor(value).trim()
}

module.exports = {
  envAsBoolean,
  envAsNumber,
  envAsString
}
