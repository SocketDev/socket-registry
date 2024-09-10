'use strict'

function decode(encoded) {
  try {
    return decodeURIComponent(encoded)
  } catch {}
  return undefined
}

function parse(query) {
  const result = {}
  if (typeof query === 'string' && query.length > 0) {
    new URLSearchParams(
      query.charCodeAt(0) === 35 /*'#'*/ ? query.slice(1) : query
    ).forEach((value, key_) => {
      const key = decode(key_)
      if (key === undefined || key in result) return
      result[key] = decode(value)
    })
  }
  return result
}

function stringify(obj, prefix = '') {
  const params =
    obj !== null && typeof obj === 'object'
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(obj).map(pairs => {
              const { 1: value } = pairs
              return value === null ||
                value === undefined ||
                (!value && isNaN(value))
                ? [pairs[0], '']
                : pairs
            })
          )
        ).toString()
      : ''
  if (params.length === 0) {
    return ''
  }
  let maybePrefix = ''
  if (typeof prefix === 'string') {
    maybePrefix = prefix
  } else if (prefix) {
    maybePrefix = '?'
  }
  return `${maybePrefix}${params}`
}

module.exports = {
  stringify,
  parse
}
