'use strict'

const slashesRegExp = /[/\\]/
const leadingDotSlashRegExp = /^\.\.?[/\\]/
const trailingSlashRegExp = /[/\\]$/

function isRelative(filepath) {
  return leadingDotSlashRegExp.test(filepath)
}

function splitPath(filepath) {
  return filepath.split(slashesRegExp)
}

function trimLeadingDotSlash(filepath) {
  return filepath.replace(leadingDotSlashRegExp, '')
}

function trimTrailingSlash(filepath) {
  return filepath.replace(trailingSlashRegExp, '')
}

module.exports = {
  isRelative,
  splitPath,
  trimLeadingDotSlash,
  trimTrailingSlash
}
