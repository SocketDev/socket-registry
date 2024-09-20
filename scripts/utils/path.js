'use strict'

const path = require('node:path')

const { PACKAGE_JSON } = require('@socketregistry/scripts/constants')

const slashRegExp = /[/\\]/
const nodeModulesPathRegExp = /(?:^|[/\\])node_modules(?:[/\\]|$)/

function isNodeModules(filepath) {
  return nodeModulesPathRegExp.test(filepath)
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

module.exports = {
  isNodeModules,
  resolvePackageJsonDirname,
  resolvePackageJsonPath,
  splitPath
}
