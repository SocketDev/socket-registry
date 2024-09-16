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

async function readPackageJson(filepath_, options = {}) {
  const filepath = filepath_.endsWith(PACKAGE_JSON)
    ? filepath_
    : path.join(filepath_, PACKAGE_JSON)
  const pkgJson = await fs.readJson(filepath)
  return options?.editable
    ? toEditablePackageJson(pkgJson, filepath)
    : normalizePackageJson(pkgJson)
}

module.exports = {
  isSymbolicLinkSync,
  readPackageJson
}
