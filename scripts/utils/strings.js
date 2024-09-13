'use strict'

const { EMPTY_FILE } = require('@socketregistry/scripts/constants')

const { compare: localCompare } = new Intl.Collator()

function capitalize(str) {
  const { length } = str
  if (length === 0) return str
  if (length === 1) return str.toUpperCase()
  return str[0].toUpperCase() + str.slice(1)
}

function formatJsSrc(src) {
  const trimmed = src.trim()
  return trimmed.length ? `'use strict'\n\n${trimmed}\n` : EMPTY_FILE
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function trimQuotes(str) {
  const { length } = str
  if (length > 1) {
    const first = str.charCodeAt(0)
    const last = str.charCodeAt(length - 1)
    if (
      (first === 39 /*"'"*/ && last === 39) ||
      (first === 34 /*'"'*/ && last === 34)
    ) {
      return str.slice(1, -1)
    }
  }
  return str
}

module.exports = {
  capitalize,
  formatJsSrc,
  isNonEmptyString,
  localCompare,
  trimQuotes
}
