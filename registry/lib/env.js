'use strict'

const NumberCtor = Number
const { isFinite: NumberIsFinite, parseInt: NumberParseInt } = NumberCtor
const StringCtor = String

/**
 * Convert an environment variable value to a boolean.
 * @param {any} value - The value to convert.
 * @param {boolean} [defaultValue=false] - Default value when input is null/undefined.
 * @returns {boolean} The boolean representation of the value.
 */
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

/**
 * Convert an environment variable value to a number.
 * @param {any} value - The value to convert.
 * @param {number} [defaultValue=0] - Default value when conversion fails.
 * @returns {number} The numeric representation of the value.
 */
/*@__NO_SIDE_EFFECTS__*/
function envAsNumber(value, defaultValue = 0) {
  const numOrNaN = NumberParseInt(value, 10)
  const numMayBeNegZero = NumberIsFinite(numOrNaN)
    ? numOrNaN
    : NumberCtor(defaultValue)
  // Ensure -0 is treated as 0.
  return numMayBeNegZero || 0
}

/**
 * Convert an environment variable value to a trimmed string.
 * @param {any} value - The value to convert.
 * @param {string} [defaultValue=''] - Default value when input is null/undefined.
 * @returns {string} The trimmed string representation of the value.
 */
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
