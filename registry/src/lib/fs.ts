/**
 * @fileoverview File system utilities with cross-platform path handling.
 * Provides enhanced fs operations, glob matching, and directory traversal functions.
 */
'use strict'

const { isArray: ArrayIsArray } = Array
const { freeze: ObjectFreeze } = Object

const { defaultIgnore, getGlobMatcher } = /*@__PURE__*/ require('./globs')
const { jsonParse } = /*@__PURE__*/ require('./json')
const { pathLikeToString } = /*@__PURE__*/ require('./path')
const { naturalCompare } = /*@__PURE__*/ require('./sorts')

const defaultRemoveOptions = ObjectFreeze({
  __proto__: null,
  force: true,
  maxRetries: 3,
  recursive: true,
  retryDelay: 200,
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

/**
 * Find a file or directory by traversing up parent directories.
 * @typedef {{cwd?: string; onlyDirectories?: boolean; onlyFiles?: boolean; signal?: AbortSignal}} FindUpOptions
 */
/*@__NO_SIDE_EFFECTS__*/
async function findUp(name, options) {
  const {
    cwd = process.cwd(),
    signal = /*@__PURE__*/ require('./constants/abort-signal'),
  } = { __proto__: null, ...options }
  let { onlyDirectories = false, onlyFiles = true } = {
    __proto__: null,
    ...options,
  }
  if (onlyDirectories) {
    onlyFiles = false
  }
  if (onlyFiles) {
    onlyDirectories = false
  }
  const fs = getFs()
  const path = getPath()
  let dir = path.resolve(cwd)
  const { root } = path.parse(dir)
  const names = ArrayIsArray(name) ? name : [name]
  while (dir && dir !== root) {
    for (const n of names) {
      if (signal?.aborted) {
        return undefined
      }
      const thePath = path.join(dir, n)
      try {
        // eslint-disable-next-line no-await-in-loop
        const stats = await fs.promises.stat(thePath)
        if (!onlyDirectories && stats.isFile()) {
          return thePath
        }
        if (!onlyFiles && stats.isDirectory()) {
          return thePath
        }
      } catch {}
    }
    dir = path.dirname(dir)
  }
  return undefined
}

/**
 * Synchronously find a file or directory by traversing up parent directories.
 */
/*@__NO_SIDE_EFFECTS__*/
function findUpSync(name, options) {
  const { cwd = process.cwd(), stopAt } = { __proto__: null, ...options }
  let { onlyDirectories = false, onlyFiles = true } = {
    __proto__: null,
    ...options,
  }
  if (onlyDirectories) {
    onlyFiles = false
  }
  if (onlyFiles) {
    onlyDirectories = false
  }
  const fs = getFs()
  const path = getPath()
  let dir = path.resolve(cwd)
  const { root } = path.parse(dir)
  const stopDir = stopAt ? path.resolve(stopAt) : undefined
  const names = ArrayIsArray(name) ? name : [name]
  while (dir && dir !== root) {
    // Check if we should stop at this directory.
    if (stopDir && dir === stopDir) {
      // Check current directory but don't go up.
      for (const n of names) {
        const thePath = path.join(dir, n)
        try {
          const stats = fs.statSync(thePath)
          if (!onlyDirectories && stats.isFile()) {
            return thePath
          }
          if (!onlyFiles && stats.isDirectory()) {
            return thePath
          }
        } catch {}
      }
      return undefined
    }
    for (const n of names) {
      const thePath = path.join(dir, n)
      try {
        const stats = fs.statSync(thePath)
        if (!onlyDirectories && stats.isFile()) {
          return thePath
        }
        if (!onlyFiles && stats.isDirectory()) {
          return thePath
        }
      } catch {}
    }
    dir = path.dirname(dir)
  }
  return undefined
}

/**
 * Process directory entries and filter for directories.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function innerReadDirNames(dirents, dirname, options) {
  const {
    ignore,
    includeEmpty = true,
    sort = true,
  } = { __proto__: null, ...options }
  const path = getPath()
  const names = dirents
    .filter(
      d =>
        d.isDirectory() &&
        (includeEmpty ||
          !isDirEmptySync(path.join(dirname || d.parentPath, d.name), {
            ignore,
          })),
    )
    .map(d => d.name)
  return sort ? names.sort(naturalCompare) : names
}

/**
 * Check if a path is a directory synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
function isDirSync(filepath) {
  const fs = getFs()
  return fs.existsSync(filepath) && !!safeStatsSync(filepath)?.isDirectory()
}

/**
 * Check if a directory is empty synchronously.
 * @typedef {{ignore?: string[] | readonly string[]}} IsDirEmptyOptions
 */
/*@__NO_SIDE_EFFECTS__*/
function isDirEmptySync(dirname, options) {
  const { ignore = defaultIgnore } = { __proto__: null, ...options }
  const fs = getFs()
  try {
    const files = fs.readdirSync(dirname)
    const { length } = files
    if (length === 0) {
      return true
    }
    const matcher = getGlobMatcher(ignore, { cwd: pathLikeToString(dirname) })
    let ignoredCount = 0
    for (let i = 0; i < length; i += 1) {
      if (matcher(files[i])) {
        ignoredCount += 1
      }
    }
    return ignoredCount === length
  } catch {
    // Return false for non-existent paths or other errors.
    return false
  }
}

/**
 * Check if a path is a symbolic link synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
function isSymLinkSync(filepath) {
  const fs = getFs()
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

/**
 * Read directory names asynchronously with filtering and sorting.
 * @typedef {{ignore?: string[] | readonly string[]; includeEmpty?: boolean; sort?: boolean}} ReadDirOptions
 */
/*@__NO_SIDE_EFFECTS__*/
async function readDirNames(dirname, options) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      await fs.promises.readdir(dirname, {
        __proto__: null,
        withFileTypes: true,
      }),
      dirname,
      options,
    )
  } catch {}
  return []
}

/**
 * Read directory names synchronously with filtering and sorting.
 */
/*@__NO_SIDE_EFFECTS__*/
function readDirNamesSync(dirname, options) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      fs.readdirSync(dirname, { __proto__: null, withFileTypes: true }),
      dirname,
      options,
    )
  } catch {}
  return []
}

/**
 * Read a file as binary data asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
async function readFileBinary(filepath, options) {
  const fs = getFs()
  // Don't specify encoding to get a Buffer
  return await fs.promises.readFile(filepath, {
    signal: /*@__PURE__*/ require('./constants/abort-signal'),
    ...options,
    encoding: null,
  })
}

/**
 * Read a file as UTF-8 text asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
async function readFileUtf8(filepath, options) {
  const fs = getFs()
  return await fs.promises.readFile(filepath, {
    signal: /*@__PURE__*/ require('./constants/abort-signal'),
    ...options,
    encoding: 'utf8',
  })
}

/**
 * Read a file as binary data synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
function readFileBinarySync(filepath, options) {
  const fs = getFs()
  // Don't specify encoding to get a Buffer
  return fs.readFileSync(filepath, {
    ...options,
    encoding: null,
  })
}

/**
 * Read a file as UTF-8 text synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
function readFileUtf8Sync(filepath, options) {
  const fs = getFs()
  return fs.readFileSync(filepath, {
    ...options,
    encoding: 'utf8',
  })
}

/**
 * Read and parse a JSON file asynchronously.
 * @typedef {{encoding?: string; throws?: boolean; reviver?: Function} & import('fs').ReadFileOptions} ReadJsonOptions
 */
/*@__NO_SIDE_EFFECTS__*/
async function readJson(filepath, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { reviver, throws, ...fsOptions } = { __proto__: null, ...options }
  const shouldThrow = throws === undefined || !!throws
  const fs = getFs()
  let content = ''
  try {
    content = await fs.promises.readFile(filepath, {
      __proto__: null,
      encoding: 'utf8',
      ...fsOptions,
    })
  } catch (e) {
    if (shouldThrow) {
      throw e
    }
    return null
  }
  return jsonParse(content, {
    filepath,
    reviver,
    throws: shouldThrow,
  })
}

/**
 * Read and parse a JSON file synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
function readJsonSync(filepath, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { reviver, throws, ...fsOptions } = { __proto__: null, ...options }
  const shouldThrow = throws === undefined || !!throws
  const fs = getFs()
  let content = ''
  try {
    content = fs.readFileSync(filepath, {
      __proto__: null,
      encoding: 'utf8',
      ...fsOptions,
    })
  } catch (e) {
    if (shouldThrow) {
      throw e
    }
    return null
  }
  return jsonParse(content, {
    filepath,
    reviver,
    throws: shouldThrow,
  })
}

/**
 * Remove a file or directory asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
async function remove(filepath, options) {
  // Attempt to workaround occasional ENOTEMPTY errors in Windows.
  // https://github.com/jprichardson/node-fs-extra/issues/532#issuecomment-1178360589
  const fs = getFs()
  await fs.promises.rm(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options,
  })
}

/**
 * Remove a file or directory synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
function removeSync(filepath, options) {
  const fs = getFs()
  fs.rmSync(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options,
  })
}

/**
 * Safely read a file asynchronously, returning undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
async function safeReadFile(filepath, options) {
  const fs = getFs()
  try {
    const opts = typeof options === 'string' ? { encoding: options } : options

    return await fs.promises.readFile(filepath, {
      signal: /*@__PURE__*/ require('./constants/abort-signal'),
      ...opts,
    })
  } catch {}
  return undefined
}

/**
 * Safely get file stats synchronously, returning undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
function safeStatsSync(filepath, options) {
  const fs = getFs()
  try {
    return fs.statSync(filepath, {
      __proto__: null,
      throwIfNoEntry: false,
      ...options,
    })
  } catch {}
  return undefined
}

/**
 * Safely read a file synchronously, returning undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
function safeReadFileSync(filepath, options) {
  const fs = getFs()
  try {
    const opts = typeof options === 'string' ? { encoding: options } : options

    return fs.readFileSync(filepath, {
      __proto__: null,
      ...opts,
    })
  } catch {}
  return undefined
}

/**
 * Stringify JSON with custom formatting options.
 */
/*@__NO_SIDE_EFFECTS__*/
function stringify(
  json,
  EOL = '\n',
  finalEOL = true,
  replacer = null,
  spaces = 2,
) {
  const EOF = finalEOL ? EOL : ''
  const str = JSON.stringify(json, replacer, spaces)
  return `${str.replace(/\n/g, EOL)}${EOF}`
}

/**
 * Generate a unique filepath by adding number suffix if the path exists.
 */
/*@__NO_SIDE_EFFECTS__*/
function uniqueSync(filepath) {
  const fs = getFs()
  const path = getPath()
  const filepathStr = String(filepath)

  // If the file doesn't exist, return as is
  if (!fs.existsSync(filepathStr)) {
    return filepathStr
  }

  const dirname = path.dirname(filepathStr)
  const ext = path.extname(filepathStr)
  const basename = path.basename(filepathStr, ext)

  let counter = 1
  let uniquePath
  do {
    uniquePath = path.join(dirname, `${basename}-${counter}${ext}`)
    counter++
  } while (fs.existsSync(uniquePath))

  return uniquePath
}

/**
 * Write JSON content to a file asynchronously with formatting.
 * @typedef {{EOL?: string; finalEOL?: boolean; replacer?: Function; spaces?: number | string} & import('fs').WriteFileOptions} WriteJsonOptions
 */
/*@__NO_SIDE_EFFECTS__*/
async function writeJson(filepath, jsonContent, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { EOL, finalEOL, replacer, spaces, ...fsOptions } = {
    __proto__: null,
    ...options,
  }
  const fs = getFs()
  const jsonString = stringify(jsonContent, EOL, finalEOL, replacer, spaces)
  await fs.promises.writeFile(filepath, jsonString, {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptions,
  })
}

/**
 * Write JSON content to a file synchronously with formatting.
 */
/*@__NO_SIDE_EFFECTS__*/
function writeJsonSync(filepath, jsonContent, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { EOL, finalEOL, replacer, spaces, ...fsOptions } = {
    __proto__: null,
    ...options,
  }
  const fs = getFs()
  const jsonString = stringify(jsonContent, EOL, finalEOL, replacer, spaces)
  fs.writeFileSync(filepath, jsonString, {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptions,
  })
}

module.exports = {
  findUp,
  findUpSync,
  isDirSync,
  isDirEmptySync,
  isSymLinkSync,
  readDirNames,
  readDirNamesSync,
  readFileBinary,
  readFileBinarySync,
  readFileUtf8,
  readFileUtf8Sync,
  readJson,
  readJsonSync,
  remove,
  removeSync,
  safeReadFile,
  safeReadFileSync,
  safeStatsSync,
  uniqueSync,
  writeJson,
  writeJsonSync,
}
