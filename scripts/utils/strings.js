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

module.exports = {
  capitalize,
  formatJsSrc,
  isNonEmptyString,
  localCompare
}
