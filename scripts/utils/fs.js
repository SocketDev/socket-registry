'use strict'

const path = require('node:path')
const util = require('node:util')

const fs = require('fs-extra')

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { innerReadDirNames, isDirEmptySync }
} = require('@socketregistry/scripts/constants')

const builtinAsyncCp = util.promisify(fs.cp)

async function cp(srcPath, destPath, options) {
  const {
    force: _force,
    overwrite,
    recursive: _recursive,
    ...otherOptions
  } = options ?? {}
  await builtinAsyncCp(srcPath, destPath, {
    force: !!overwrite,
    recursive: true,
    ...otherOptions
  })
}

function isSameRealpathSync(filepath1, filepath2) {
  if (filepath1 === filepath2) {
    return true
  }
  if (path.resolve(filepath1) === path.resolve(filepath2)) {
    return true
  }
  try {
    if (fs.realpathSync(filepath1) === path.realpathSync(filepath2)) {
      return isSymbolicLinkSync(filepath1) === isSymbolicLinkSync(filepath2)
    }
  } catch {}
  return false
}

function isSymbolicLinkSync(filepath) {
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

async function move(srcPath, destPath, options) {
  if (!isSameRealpathSync(srcPath, destPath)) {
    await fs.remove(destPath)
    await cp(srcPath, destPath, options)
    await fs.remove(srcPath)
  }
}

async function readDirNames(dirname, options) {
  return innerReadDirNames(
    await fs.readdir(dirname, { withFileTypes: true }),
    options
  )
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
  move,
  readDirNames,
  uniqueSync
}
