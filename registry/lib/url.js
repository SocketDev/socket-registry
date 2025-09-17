'use strict'

const BooleanCtor = Boolean
const UrlCtor = URL

/**
 * Check if a value is a valid URL.
 * @param {any} value - Value to check.
 * @returns {boolean} True if value is a valid URL.
 */
/*@__NO_SIDE_EFFECTS__*/
function isUrl(value) {
  return (
    ((typeof value === 'string' && value !== '') ||
      (value !== null && typeof value === 'object')) &&
    !!parseUrl(value)
  )
}

/**
 * Parse a value as a URL.
 * @param {string|URL} value - Value to parse.
 * @returns {URL|null} Parsed URL object or null if invalid.
 */
/*@__NO_SIDE_EFFECTS__*/
function parseUrl(value) {
  try {
    return new UrlCtor(value)
  } catch {}
  return null
}

/**
 * Convert a URL search parameter to an array.
 * @param {string} value - Search parameter value.
 * @returns {string[]} Array of trimmed values.
 */
/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamAsArray(value) {
  return typeof value === 'string'
    ? value.trim().split(/, */).filter(BooleanCtor)
    : []
}

/**
 * Convert a URL search parameter to a boolean.
 * @param {any} value - Search parameter value.
 * @param {boolean} [defaultValue=false] - Default value when null/undefined.
 * @returns {boolean} Boolean representation of the value.
 */
/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamAsBoolean(value, defaultValue = false) {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '1' || trimmed.toLowerCase() === 'true'
  }
  if (value === null || value === undefined) {
    return !!defaultValue
  }
  return !!value
}

module.exports = {
  isUrl,
  parseUrl,
  urlSearchParamAsArray,
  urlSearchParamAsBoolean
}
