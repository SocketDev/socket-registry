'use strict'

const path = require('node:path')

const fs = require('fs-extra')

const {
  PACKAGE_JSON,
  innerReadDirNames,
  readDirNamesSync
} = require('@socketregistry/scripts/constants')
const {
  normalizePackageJson,
  toEditablePackageJson,
  toEditablePackageJsonSync
} = require('@socketregistry/scripts/utils/packages')

function isSymbolicLinkSync(filepath) {
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

function normalizePackageJsonPath(filepath) {
  return filepath.endsWith(PACKAGE_JSON)
    ? filepath
    : path.join(filepath, PACKAGE_JSON)
}

async function readDirNames(dirname, options) {
  return innerReadDirNames(
    await fs.readdir(dirname, { withFileTypes: true }),
    options
  )
}

async function readPackageJson(filepath, options) {
  const jsonPath = normalizePackageJsonPath(filepath)
  const pkgJson = await fs.readJson(jsonPath)
  return options?.editable
    ? await toEditablePackageJson(pkgJson, filepath)
    : normalizePackageJson(pkgJson)
}

function readPackageJsonSync(filepath, options) {
  const jsonPath = normalizePackageJsonPath(filepath)
  const pkgJson = fs.readJsonSync(jsonPath)
  return options?.editable
    ? toEditablePackageJsonSync(pkgJson, filepath)
    : normalizePackageJson(pkgJson)
}

module.exports = {
  isSymbolicLinkSync,
  readDirNames,
  readDirNamesSync,
  readPackageJson,
  readPackageJsonSync
}
