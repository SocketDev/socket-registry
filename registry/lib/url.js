'use strict'

const BooleanCtor = Boolean

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
  urlSearchParamAsArray,
  urlSearchParamAsBoolean
}
