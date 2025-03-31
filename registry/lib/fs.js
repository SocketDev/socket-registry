'use strict'

const { getGlobMatcher } = /*@__PURE__*/ require('./globs')
const { naturalCompare } = /*@__PURE__*/ require('./sorts')
const { stripBom } = /*@__PURE__*/ require('./strings')

const defaultRemoveOptions = Object.freeze({
  __proto__: null,
  force: true,
  maxRetries: 3,
  recursive: true,
  retryDelay: 200
})

let _fs
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = /*@__PURE__*/ require('fs')
  }
  return _fs
}

let _path
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path
}

/*@__NO_SIDE_EFFECTS__*/
function innerReadDirNames(dirents, options) {
  const { includeEmpty, sort } = {
    __proto__: null,
    sort: true,
    includeEmpty: false,
    ...options
  }
  const path = getPath()
  const names = dirents
    .filter(
      d =>
        d.isDirectory() &&
        (includeEmpty || !isDirEmptySync(path.join(d.parentPath, d.name)))
    )
    .map(d => d.name)
  return sort ? names.sort(naturalCompare) : names
}

/*@__NO_SIDE_EFFECTS__*/
function isDirEmptySync(dirname) {
  const fs = getFs()
  try {
    const files = fs.readdirSync(dirname)
    const { length } = files
    if (length === 0) {
      return true
    }
    const matcher = getGlobMatcher(
      /*@__PURE__*/ require('./constants/ignore-globs'),
      { cwd: dirname }
    )
    let ignoredCount = 0
    for (let i = 0; i < length; i += 1) {
      if (matcher(files[i])) {
        ignoredCount += 1
      }
    }
    return ignoredCount === length
  } catch (e) {
    return e?.code === 'ENOENT'
  }
}

/*@__NO_SIDE_EFFECTS__*/
function isSymbolicLinkSync(filepath) {
  const fs = getFs()
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function readDirNamesSync(dirname, options) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      fs.readdirSync(dirname, { withFileTypes: true }),
      options
    )
  } catch {}
  return []
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
function removeSync(filepath, options) {
  const fs = getFs()
  fs.rmSync(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options
  })
}

/*@__NO_SIDE_EFFECTS__*/
function stringify(
  json,
  EOL = '\n',
  finalEOL = true,
  replacer = null,
  spaces = 2
) {
  const EOF = finalEOL ? EOL : ''
  const str = JSON.stringify(json, replacer, spaces)
  return `${str.replace(/\n/g, EOL)}${EOF}`
}

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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

/*@__NO_SIDE_EFFECTS__*/
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
