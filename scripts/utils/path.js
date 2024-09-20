'use strict'

const path = require('node:path')

const { PACKAGE_JSON } = require('@socketregistry/scripts/constants')

const slashRegExp = /[/\\]/
const leadingDotSlashRegExp = /^\.\.?[/\\]/
const nodeModulesPathRegExp = /(?:^|[/\\])node_modules(?:[/\\]|$)/
const trailingSlashRegExp = /[/\\]$/

function isNodeModules(filepath) {
  return nodeModulesPathRegExp.test(filepath)
}

function isRelative(filepath) {
  return leadingDotSlashRegExp.test(filepath)
}

function resolvePackageJsonPath(filepath) {
  return filepath.endsWith(PACKAGE_JSON)
    ? filepath
    : path.join(filepath, PACKAGE_JSON)
}

function resolvePackageJsonDirname(filepath) {
  return filepath.endsWith(PACKAGE_JSON) ? path.dirname(filepath) : filepath
}

function splitPath(filepath) {
  return filepath.split(slashRegExp)
}

function trimLeadingDotSlash(filepath) {
  return filepath.replace(leadingDotSlashRegExp, '')
}

function trimTrailingSlash(filepath) {
  return filepath.replace(trailingSlashRegExp, '')
}

module.exports = {
  isNodeModules,
  isRelative,
  resolvePackageJsonDirname,
  resolvePackageJsonPath,
  splitPath,
  trimLeadingDotSlash,
  trimTrailingSlash
}
