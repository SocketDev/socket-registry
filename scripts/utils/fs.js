'use strict'

const path = require('node:path')

const fs = require('fs-extra')

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { innerReadDirNames, isDirEmptySync }
} = require('@socketregistry/scripts/constants')

const defaultRemoveOptions = Object.freeze({
  __proto__: null,
  force: true,
  maxRetries: 3,
  recursive: true,
  retryDelay: 200
})

function isSymbolicLinkSync(filepath) {
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

async function readDirNames(dirname, options) {
  return innerReadDirNames(
    await fs.readdir(dirname, { withFileTypes: true }),
    options
  )
}

async function remove(filepath, options) {
  // Attempt to workaround occasional ENOTEMPTY errors in Windows.
  // https://github.com/jprichardson/node-fs-extra/issues/532#issuecomment-1178360589
  await fs.rm(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options
  })
}

function removeSync(filepath, options) {
  fs.rmSync(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options
  })
}

function uniqueSync(filepath) {
  const dirname = path.dirname(filepath)
  let basename = path.basename(filepath)
  while (fs.existsSync(`${dirname}/${basename}`)) {
    basename = `_${basename}`
  }
  return path.join(dirname, basename)
}

module.exports = {
  isDirEmptySync,
  isSymbolicLinkSync,
  readDirNames,
  remove,
  removeSync,
  uniqueSync
}
