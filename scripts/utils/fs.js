'use strict'

const path = require('node:path')

const fs = require('fs-extra')

const { PACKAGE_JSON } = require('@socketregistry/scripts/constants')
const { normalizePackageJson, toEditablePackageJson } = require('./packages')

function isSymbolicLinkSync(filepath) {
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

function innerReadPackageJson(pkgJson, options) {
  return options?.editable
    ? toEditablePackageJson(pkgJson, filepath)
    : normalizePackageJson(pkgJson)
}

function normalizePackageJsonPath(filepath) {
  return filepath.endsWith(PACKAGE_JSON)
    ? filepath
    : path.join(filepath, PACKAGE_JSON)
}

async function readPackageJson(filepath, options = {}) {
  return innerReadPackageJson(
    await fs.readJson(normalizePackageJsonPath(filepath)),
    options
  )
}

function readPackageJsonSync(filepath, options = {}) {
  return innerReadPackageJson(
    fs.readJsonSync(normalizePackageJsonPath(filepath)),
    options
  )
}

module.exports = {
  isSymbolicLinkSync,
  readPackageJson,
  readPackageJsonSync
}
