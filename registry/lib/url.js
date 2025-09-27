/**
 * @fileoverview URL parsing and validation utilities.
 * Provides URL validation, normalization, and parsing helpers.
 */
'use strict'

const BooleanCtor = Boolean
const UrlCtor = URL

/**
 * Check if a value is a valid URL.
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
 */
/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamAsArray(value) {
  return typeof value === 'string'
    ? value
        .trim()
        .split(/, */)
        .map(v => v.trim())
        .filter(BooleanCtor)
    : []
}

/**
 * Convert a URL search parameter to a boolean.
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

/**
 * Helper to get array from URLSearchParams.
 */
/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamsGetArray(params, key) {
  if (params && typeof params.getAll === 'function') {
    const values = params.getAll(key)
    // If single value contains commas, split it
    if (values.length === 1 && values[0].includes(',')) {
      return urlSearchParamAsArray(values[0])
    }
    return values
  }
  return []
}

/**
 * Helper to get boolean from URLSearchParams.
 */
/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamsGetBoolean(params, key, defaultValue = false) {
  if (params && typeof params.get === 'function') {
    const value = params.get(key)
    return value !== null
      ? urlSearchParamAsBoolean(value, defaultValue)
      : defaultValue
  }
  return defaultValue
}

/**
 * Create a relative URL for testing.
 */
/*@__NO_SIDE_EFFECTS__*/
function createRelativeUrl(path, base = '') {
  // Remove leading slash to make it relative.
  const relativePath = path.replace(/^\//, '')

  if (base) {
    if (!base.endsWith('/')) {
      base += '/'
    }
    return base + relativePath
  }

  return relativePath
}

/**
 * Get string value from URLSearchParams with a default.
 */
/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamAsString(params, key, defaultValue = '') {
  if (params && typeof params.get === 'function') {
    const value = params.get(key)
    return value !== null ? value : defaultValue
  }
  return defaultValue
}

/**
 * Get number value from URLSearchParams with a default.
 */
/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamAsNumber(params, key, defaultValue = 0) {
  if (params && typeof params.get === 'function') {
    const value = params.get(key)
    if (value !== null) {
      const num = Number(value)
      return !isNaN(num) ? num : defaultValue
    }
  }
  return defaultValue
}

module.exports = {
  createRelativeUrl,
  isUrl,
  parseUrl,
  urlSearchParamAsArray,
  urlSearchParamAsBoolean,
  urlSearchParamAsNumber,
  urlSearchParamAsString,
  urlSearchParamsGetArray,
  urlSearchParamsGetBoolean,
}
