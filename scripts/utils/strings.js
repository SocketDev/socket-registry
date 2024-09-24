'use strict'

function indentString(str, count = 1) {
  return str.replace(/^(?!\s*$)/gm, ' '.repeat(count))
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function search(str, regexp, fromIndex = 0) {
  const { length } = str
  if (fromIndex >= length) return -1
  if (fromIndex === 0) return str.search(regexp)
  const offset = fromIndex < 0 ? Math.max(length + fromIndex, 0) : fromIndex
  const result = str.slice(offset).search(regexp)
  return result === -1 ? -1 : result + offset
}

module.exports = {
  indentString,
  isNonEmptyString,
  search
}
