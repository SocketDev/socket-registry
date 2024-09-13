'use strict'

const path = require('node:path')

const fs = require('fs-extra')

const { PACKAGE_JSON } = require('@socketregistry/scripts/constants')
const { normalizePackageJson } = require('./packages')

function isSymbolicLinkSync(filepath) {
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

async function readPackageJson(filepath_) {
  const filepath = filepath_.endsWith(PACKAGE_JSON)
    ? filepath_
    : path.join(filepath_, PACKAGE_JSON)
  return normalizePackageJson(await fs.readJson(filepath))
  return
}

module.exports = {
  isSymbolicLinkSync,
  readPackageJson
}
