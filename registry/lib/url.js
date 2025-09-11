'use strict'

const BooleanCtor = Boolean

/*@__NO_SIDE_EFFECTS__*/
function isUrl(value) {
  const isStr = typeof value === 'string'
  if (isStr && value === '') {
    return false
  }
  const isObj = !isStr && value !== null && typeof value === 'object'
  if (!isStr && !isObj) {
    return false
  }
  try {
    // eslint-disable-next-line no-new
    new URL(value)
    return true
  } catch {}
  return false
}

/*@__NO_SIDE_EFFECTS__*/
function urlSearchParamAsArray(value) {
  return typeof value === 'string'
    ? value.trim().split(/, */).filter(BooleanCtor)
    : []
}

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
  urlSearchParamAsArray,
  urlSearchParamAsBoolean
}
