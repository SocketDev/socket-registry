'use strict'

// Upstream decodes exactly once, after mapping '+' to space; a failed decode
// yields null so the whole pair is dropped. A URLSearchParams core diverges
// on both counts: it pre-decodes entries, so a second pass double-decodes
// '%2520' style input, and it keeps pairs whose value fails to decode.
function decode(input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, ' '))
  } catch {
    return null
  }
}

function encode(input) {
  try {
    return encodeURIComponent(input)
  } catch {
    return null
  }
}

function parse(query) {
  // Upstream's parser: keys never contain '=?#&', values run to the next '&'.
  const parser = /([^=?#&]+)=?([^&]*)/g
  const result = {}
  if (typeof query === 'string') {
    let part
    while ((part = parser.exec(query)) !== null) {
      const key = decode(part[1])
      const value = decode(part[2])
      // The `in` check is load-bearing upstream contract: it dedupes repeated
      // keys AND drops any key shadowing an Object.prototype member, so
      // '__proto__' can never be assigned and parsed.toString stays callable.
      if (key === null || value === null || key in result) {
        continue
      }
      result[key] = value
    }
  }
  return result
}

function stringify(obj, prefix = '') {
  let maybePrefix = ''
  if (typeof prefix === 'string') {
    maybePrefix = prefix
  } else if (prefix) {
    maybePrefix = '?'
  }
  const pairs = []
  if (obj !== null && typeof obj === 'object') {
    const keys = Object.keys(obj)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]
      let value = obj[key]
      if (
        !value &&
        (value === null || value === undefined || Number.isNaN(value))
      ) {
        value = ''
      }
      const encodedKey = encode(key)
      const encodedValue = encode(value)
      // Upstream drops the whole pair when either side fails to encode, so a
      // lone surrogate never emits a replacement character.
      if (encodedKey === null || encodedValue === null) {
        continue
      }
      pairs.push(`${encodedKey}=${encodedValue}`)
    }
  }
  return pairs.length > 0 ? `${maybePrefix}${pairs.join('&')}` : ''
}

module.exports = {
  parse,
  stringify,
}
