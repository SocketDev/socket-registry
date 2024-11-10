'use strict'

const prettier = require('prettier')

const constants = require('./constants')

function indentString(str, count = 1) {
  return str.replace(/^(?!\s*$)/gm, ' '.repeat(count))
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

async function prettierFormat(str, options) {
  return prettier.format(str, {
    __proto__: null,
    // Lazily access constants.prettierConfigPromise.
    ...(await constants.prettierConfigPromise),
    ...options
  })
}

function search(str, regexp, fromIndex = 0) {
  const { length } = str
  if (fromIndex >= length) return -1
  if (fromIndex === 0) return str.search(regexp)
  const offset = fromIndex < 0 ? Math.max(length + fromIndex, 0) : fromIndex
  const result = str.slice(offset).search(regexp)
  return result === -1 ? -1 : result + offset
}

function stripBom(str) {
  // In JavaScript, string data is stored as UTF-16, so BOM is 0xFEFF.
  // https://tc39.es/ecma262/#sec-unicode-format-control-characters
  return str.length > 0 && str.charCodeAt(0) === 0xfeff ? str.slice(1) : str
}

module.exports = {
  indentString,
  isNonEmptyString,
  prettierFormat,
  search,
  stripBom
}
