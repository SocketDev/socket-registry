'use strict'

const { isArray: ArrayIsArray } = Array
const { freeze: ObjectFreeze } = Object

const { defaultIgnore, getGlobMatcher } = /*@__PURE__*/ require('./globs')
const { jsonParse } = /*@__PURE__*/ require('./json')
const { naturalCompare } = /*@__PURE__*/ require('./sorts')
const { pathLikeToString } = /*@__PURE__*/ require('./path')

const defaultRemoveOptions = ObjectFreeze({
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

/**
 * Find a file or directory by traversing up parent directories.
 * @param {string | string[]} name - Name(s) to search for.
 * @param {FindUpOptions} [options] - Search options.
 * @returns {Promise<string | undefined>} Path to found file/directory.
 * @typedef {{cwd?: string; onlyDirectories?: boolean; onlyFiles?: boolean; signal?: AbortSignal}} FindUpOptions
 */
/*@__NO_SIDE_EFFECTS__*/
async function findUp(name, options) {
  const {
    cwd = process.cwd(),
    signal = /*@__PURE__*/ require('./constants/abort-signal')
  } = { __proto__: null, ...options }
  let { onlyDirectories = false, onlyFiles = true } = {
    __proto__: null,
    ...options
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
 * @param {string | string[]} name - Name(s) to search for.
 * @param {Omit<FindUpOptions, 'signal'>} [options] - Search options.
 * @returns {string | undefined} Path to found file/directory.
 */
/*@__NO_SIDE_EFFECTS__*/
function findUpSync(name, options) {
  const { cwd = process.cwd() } = { __proto__: null, ...options }
  let { onlyDirectories = false, onlyFiles = true } = {
    __proto__: null,
    ...options
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
 * @param {import('fs').Dirent[]} dirents - Directory entries to process.
 * @param {ReadDirOptions} [options] - Options for filtering and sorting.
 * @returns {string[]} Array of directory names.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function innerReadDirNames(dirents, options) {
  const {
    ignore,
    includeEmpty = false,
    sort = true
  } = { __proto__: null, ...options }
  const path = getPath()
  const names = dirents
    .filter(
      d =>
        d.isDirectory() &&
        (includeEmpty ||
          !isDirEmptySync(path.join(d.parentPath, d.name), { ignore }))
    )
    .map(d => d.name)
  return sort ? names.sort(naturalCompare) : names
}

/**
 * Check if a path is a directory synchronously.
 * @param {import('fs').PathLike} filepath - Path to check.
 * @returns {boolean} True if the path is a directory.
 */
/*@__NO_SIDE_EFFECTS__*/
function isDirSync(filepath) {
  const fs = getFs()
  return fs.existsSync(filepath) && !!safeStatsSync(filepath)?.isDirectory()
}

/**
 * Check if a directory is empty synchronously.
 * @param {import('fs').PathLike} dirname - Directory path to check.
 * @param {IsDirEmptyOptions} [options] - Options with ignore patterns.
 * @returns {boolean} True if the directory is empty or only contains ignored files.
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
  } catch (e) {
    return e?.code === 'ENOENT'
  }
}

/**
 * Check if a path is a symbolic link synchronously.
 * @param {import('fs').PathLike} filepath - Path to check.
 * @returns {boolean} True if the path is a symbolic link.
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
 * @param {import('fs').PathLike} dirname - Directory to read.
 * @param {ReadDirOptions} [options] - Options for filtering and sorting.
 * @returns {Promise<string[]>} Array of directory names.
 * @typedef {{ignore?: string[] | readonly string[]; includeEmpty?: boolean; sort?: boolean}} ReadDirOptions
 */
/*@__NO_SIDE_EFFECTS__*/
async function readDirNames(dirname, options) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      await fs.promises.readdir(dirname, {
        __proto__: null,
        withFileTypes: true
      }),
      options
    )
  } catch {}
  return []
}

/**
 * Read directory names synchronously with filtering and sorting.
 * @param {import('fs').PathLike} dirname - Directory to read.
 * @param {ReadDirOptions} [options] - Options for filtering and sorting.
 * @returns {string[]} Array of directory names.
 */
/*@__NO_SIDE_EFFECTS__*/
function readDirNamesSync(dirname, options) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      fs.readdirSync(dirname, { __proto__: null, withFileTypes: true }),
      options
    )
  } catch {}
  return []
}

/**
 * Read a file as binary data asynchronously.
 * @param {import('fs').PathLike | import('fs/promises').FileHandle} filepath - Path to the file.
 * @param {import('fs').ReadFileOptions} [options] - Read options.
 * @returns {Promise<Buffer>} The file contents as a Buffer.
 */
/*@__NO_SIDE_EFFECTS__*/
async function readFileBinary(filepath, options) {
  const fs = getFs()
  return await fs.promises.readFile(filepath, {
    signal: /*@__PURE__*/ require('./constants/abort-signal'),
    ...options,
    encoding: 'binary'
  })
}

/**
 * Read a file as UTF-8 text asynchronously.
 * @param {import('fs').PathLike | import('fs/promises').FileHandle} filepath - Path to the file.
 * @param {import('fs').ReadFileOptions} [options] - Read options.
 * @returns {Promise<string>} The file contents as a string.
 */
/*@__NO_SIDE_EFFECTS__*/
async function readFileUtf8(filepath, options) {
  const fs = getFs()
  return await fs.promises.readFile(filepath, {
    signal: /*@__PURE__*/ require('./constants/abort-signal'),
    ...options,
    encoding: 'utf8'
  })
}

/**
 * Read and parse a JSON file asynchronously.
 * @param {import('fs').PathLike} filepath - Path to the JSON file.
 * @param {ReadJsonOptions} [options] - Read and parse options.
 * @returns {Promise<any>} The parsed JSON content.
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
      ...fsOptions
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
    throws: shouldThrow
  })
}

/**
 * Read and parse a JSON file synchronously.
 * @param {import('fs').PathLike} filepath - Path to the JSON file.
 * @param {ReadJsonOptions} [options] - Read and parse options.
 * @returns {any} The parsed JSON content.
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
      ...fsOptions
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
    throws: shouldThrow
  })
}

/**
 * Remove a file or directory asynchronously.
 * @param {import('fs').PathLike} filepath - Path to remove.
 * @param {import('fs').RmOptions} [options] - Remove options.
 * @returns {Promise<void>}
 */
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

/**
 * Remove a file or directory synchronously.
 * @param {import('fs').PathLike} filepath - Path to remove.
 * @param {import('fs').RmOptions} [options] - Remove options.
 * @returns {void}
 */
/*@__NO_SIDE_EFFECTS__*/
function removeSync(filepath, options) {
  const fs = getFs()
  fs.rmSync(filepath, {
    __proto__: null,
    ...defaultRemoveOptions,
    ...options
  })
}

/**
 * Safely read a file asynchronously, returning undefined on error.
 * @param {import('fs').PathLike | import('fs/promises').FileHandle} filepath - Path to the file.
 * @param {import('fs').ReadFileOptions | string} [options] - Read options or encoding.
 * @returns {Promise<string | undefined>} The file contents or undefined if read fails.
 */
/*@__NO_SIDE_EFFECTS__*/
async function safeReadFile(filepath, options) {
  const fs = getFs()
  try {
    return await fs.promises.readFile(filepath, {
      encoding: 'utf8',
      signal: /*@__PURE__*/ require('./constants/abort-signal'),
      ...(typeof options === 'string' ? { encoding: options } : options)
    })
  } catch {}
  return undefined
}

/**
 * Safely get file stats synchronously, returning undefined on error.
 * @param {import('fs').PathLike} filepath - Path to stat.
 * @param {import('fs').StatSyncOptions} [options] - Stat options.
 * @returns {import('fs').Stats | undefined} File stats or undefined if stat fails.
 */
/*@__NO_SIDE_EFFECTS__*/
function safeStatsSync(filepath, options) {
  const fs = getFs()
  try {
    return fs.statSync(filepath, {
      __proto__: null,
      throwIfNoEntry: false,
      ...options
    })
  } catch {}
  return undefined
}

/**
 * Safely read a file synchronously, returning undefined on error.
 * @param {import('fs').PathOrFileDescriptor} filepath - Path to the file.
 * @param {import('fs').ReadFileOptions | string} [options] - Read options or encoding.
 * @returns {string | Buffer | undefined} The file contents or undefined if read fails.
 */
/*@__NO_SIDE_EFFECTS__*/
function safeReadFileSync(filepath, options) {
  const fs = getFs()
  try {
    return fs.readFileSync(filepath, {
      __proto__: null,
      encoding: 'utf8',
      ...(typeof options === 'string' ? { encoding: options } : options)
    })
  } catch {}
  return undefined
}

/**
 * Stringify JSON with custom formatting options.
 * @param {any} json - The JSON object to stringify.
 * @param {string} [EOL='\n'] - End of line character.
 * @param {boolean} [finalEOL=true] - Whether to add final EOL.
 * @param {Function | null} [replacer=null] - JSON replacer function.
 * @param {number | string} [spaces=2] - Indentation spaces.
 * @returns {string} The formatted JSON string.
 */
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

/**
 * Generate a unique filepath by prepending underscores if the path exists.
 * @param {import('fs').PathLike} filepath - The desired filepath.
 * @returns {string} A unique filepath that doesn't exist.
 */
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

/**
 * Write JSON content to a file asynchronously with formatting.
 * @param {import('fs').PathLike} filepath - Path to write to.
 * @param {any} jsonContent - The JSON content to write.
 * @param {WriteJsonOptions} [options] - Write and format options.
 * @returns {Promise<void>}
 * @typedef {{EOL?: string; finalEOL?: boolean; replacer?: Function; spaces?: number | string} & import('fs').WriteFileOptions} WriteJsonOptions
 */
/*@__NO_SIDE_EFFECTS__*/
async function writeJson(filepath, jsonContent, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { EOL, finalEOL, replacer, spaces, ...fsOptions } = {
    __proto__: null,
    ...options
  }
  const fs = getFs()
  const jsonString = stringify(jsonContent, EOL, finalEOL, replacer, spaces)
  await fs.promises.writeFile(filepath, jsonString, {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptions
  })
}

/**
 * Write JSON content to a file synchronously with formatting.
 * @param {import('fs').PathLike} filepath - Path to write to.
 * @param {any} jsonContent - The JSON content to write.
 * @param {WriteJsonOptions} [options] - Write and format options.
 * @returns {void}
 */
/*@__NO_SIDE_EFFECTS__*/
function writeJsonSync(filepath, jsonContent, options) {
  if (typeof options === 'string') {
    options = { encoding: options }
  }
  const { EOL, finalEOL, replacer, spaces, ...fsOptions } = {
    __proto__: null,
    ...options
  }
  const fs = getFs()
  const jsonString = stringify(jsonContent, EOL, finalEOL, replacer, spaces)
  fs.writeFileSync(filepath, jsonString, {
    __proto__: null,
    encoding: 'utf8',
    ...fsOptions
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
  readFileUtf8,
  readJson,
  readJsonSync,
  remove,
  removeSync,
  safeReadFile,
  safeReadFileSync,
  safeStatsSync,
  uniqueSync,
  writeJson,
  writeJsonSync
}
