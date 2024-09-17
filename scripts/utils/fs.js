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

function innerReadPackageJson(filepath, pkgJson, options) {
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
  const jsonPath = normalizePackageJsonPath(filepath)
  return innerReadPackageJson(jsonPath, await fs.readJson(jsonPath), options)
}

function readPackageJsonSync(filepath, options = {}) {
  const jsonPath = normalizePackageJsonPath(filepath)
  return innerReadPackageJson(jsonPath, fs.readJsonSync(jsonPath), options)
}

module.exports = {
  isSymbolicLinkSync,
  readPackageJson,
  readPackageJsonSync
}
