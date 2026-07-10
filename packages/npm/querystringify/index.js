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
    const entries = [
      ...new URLSearchParams(
        query.charCodeAt(0) === 35 /*'#'*/ ? query.slice(1) : query,
      ).entries(),
    ]
    for (let i = 0, { length } = entries; i < length; i += 1) {
      const key = decode(entries[i][0])
      if (key === undefined || key in result) {
        continue
      }
      result[key] = decode(entries[i][1])
    }
  }
  return result
}

function stringify(obj, prefix = '') {
  const params =
    obj !== null && typeof obj === 'object'
      ? new URLSearchParams(
          Object.fromEntries(
            Object.entries(obj).map(pair => {
              const { 1: value } = pair
              return value === null ||
                value === undefined ||
                (!value && Number.isNaN(value))
                ? [pair[0], '']
                : pair
            }),
          ),
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
  parse,
  stringify,
}
