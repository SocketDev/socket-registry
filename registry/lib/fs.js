'use strict'

let _fs
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = require('fs')
  }
  return _fs
}

let _path
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = require('path')
  }
  return _path
}

const {
  kInternalsSymbol,
  [kInternalsSymbol]: { innerReadDirNames, isDirEmptySync, readDirNamesSync }
} = require('./constants')
const { stripBom } = require('./strings')

const defaultRemoveOptions = Object.freeze({
  __proto__: null,
  force: true,
  maxRetries: 3,
  recursive: true,
  retryDelay: 200
})

function isSymbolicLinkSync(filepath) {
  const fs = getFs()
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

function parse(filepath, content, reviver, shouldThrow) {
  const str = Buffer.isBuffer(content) ? content.toString('utf8') : content
  try {
    return JSON.parse(stripBom(str), reviver)
  } catch (e) {
    if (shouldThrow) {
      if (e) {
        e.message = `${filepath}: ${e.message}`
      }
      throw e
    }
  }
  return null
}

async function readDirNames(dirname, options) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      await fs.promises.readdir(dirname, { withFileTypes: true }),
      options
    )
  } catch {}
  return []
}

async function readJson(filepath, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { reviver, throws, ...fsOptionsRaw } = { __proto__: null, ...options }
  const fsOptions = {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptionsRaw
  }
  const fs = getFs()
  const shouldThrow = throws === undefined || !!throws
  return parse(
    filepath,
    await fs.promises.readFile(filepath, fsOptions),
    reviver,
    shouldThrow
  )
}

function readJsonSync(filepath, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { reviver, throws, ...fsOptionsRaw } = { __proto__: null, ...options }
  const fsOptions = {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptionsRaw
  }
  const fs = getFs()
  const shouldThrow = throws === undefined || !!throws
  return parse(
    filepath,
    fs.readFileSync(filepath, fsOptions),
    reviver,
    shouldThrow
  )
}

async function remove(filepath, options) {
  // Attempt to workaround occasional ENOTEMPTY errors in Windows.
  // https://github.com/jprichardson/node-fs-extra/issues/532#issuecomment-1178360589
  const fs = getFs()
  await fs.promises.rm(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options
  })
}

function removeSync(filepath, options) {
  const fs = getFs()
  fs.rmSync(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options
  })
}

function stringify(json, EOL = '\n', finalEOL = true, replacer = null, spaces) {
  const EOF = finalEOL ? EOL : ''
  const str = JSON.stringify(json, replacer, spaces)
  return `${str.replace(/\n/g, EOL)}${EOF}`
}

function uniqueSync(filepath) {
  const fs = getFs()
  const path = getPath()
  const dirname = path.dirname(filepath)
  let basename = path.basename(filepath)
  while (fs.existsSync(`${dirname}/${basename}`)) {
    basename = `_${basename}`
  }
  return path.join(dirname, basename)
}

async function writeJson(filepath, json, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { EOL, finalEOL, replacer, spaces, ...fsOptionsRaw } = {
    __proto__: null,
    ...options
  }
  const fsOptions = {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptionsRaw
  }
  const fs = getFs()
  const str = stringify(json, EOL, finalEOL, replacer, spaces)
  await fs.promises.writeFile(filepath, str, fsOptions)
}

function writeJsonSync(filepath, json, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { EOL, finalEOL, replacer, spaces, ...fsOptionsRaw } = {
    __proto__: null,
    ...options
  }
  const fsOptions = {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptionsRaw
  }
  const fs = getFs()
  const str = stringify(json, EOL, finalEOL, replacer, spaces)
  fs.writeFileSync(filepath, str, fsOptions)
}

module.exports = {
  isDirEmptySync,
  isSymbolicLinkSync,
  readJson,
  readJsonSync,
  readDirNames,
  readDirNamesSync,
  remove,
  removeSync,
  uniqueSync,
  writeJson,
  writeJsonSync
}
