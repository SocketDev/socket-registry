/**
 * @fileoverview File system utilities with cross-platform path handling.
 * Provides enhanced fs operations, glob matching, and directory traversal functions.
 */

import type { Abortable } from 'node:events'
import type {
  Dirent,
  ObjectEncodingOptions,
  OpenMode,
  PathLike,
  StatSyncOptions,
  WriteFileOptions,
} from 'node:fs'

import { getAbortSignal } from '#constants/process'

import { isArray } from './arrays'

const abortSignal = getAbortSignal()

import { defaultIgnore, getGlobMatcher } from './globs'
import type { JsonReviver } from './json'
import { jsonParse } from './json'
import { objectFreeze, type Remap } from './objects'
import { normalizePath, pathLikeToString } from './path'
import { naturalCompare } from './sorts'

// Type definitions
export type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex'

export type JsonContent = unknown

export interface FindUpOptions {
  cwd?: string
  onlyDirectories?: boolean
  onlyFiles?: boolean
  signal?: AbortSignal
}

export interface FindUpSyncOptions {
  cwd?: string
  stopAt?: string
  onlyDirectories?: boolean
  onlyFiles?: boolean
}

export interface IsDirEmptyOptions {
  ignore?: string[] | readonly string[] | undefined
}

export interface ReadOptions extends Abortable {
  encoding?: BufferEncoding | string
  flag?: string
}

export interface ReadDirOptions {
  ignore?: string[] | readonly string[] | undefined
  includeEmpty?: boolean | undefined
  sort?: boolean | undefined
}

export type ReadFileOptions =
  | Remap<
      ObjectEncodingOptions &
        Abortable & {
          flag?: OpenMode | undefined
        }
    >
  | BufferEncoding
  | null

export type ReadJsonOptions = Remap<
  ReadFileOptions & {
    throws?: boolean | undefined
    reviver?: Parameters<typeof JSON.parse>[1]
  }
>

export interface RemoveOptions {
  force?: boolean
  maxRetries?: number
  recursive?: boolean
  retryDelay?: number
  signal?: AbortSignal
}

export interface SafeReadOptions extends ReadOptions {
  defaultValue?: unknown
}

export interface WriteOptions extends Abortable {
  encoding?: BufferEncoding | string
  mode?: number
  flag?: string
}

export interface WriteJsonOptions extends WriteOptions {
  EOL?: string | undefined
  finalEOL?: boolean | undefined
  replacer?: JsonReviver | undefined
  spaces?: number | string | undefined
}

const defaultRemoveOptions = objectFreeze({
  __proto__: null,
  force: true,
  maxRetries: 3,
  recursive: true,
  retryDelay: 200,
})

let _fs: typeof import('fs') | undefined
/**
 * Lazily load the fs module to avoid Webpack errors.
 */
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    _fs = /*@__PURE__*/ require('node:fs')
  }
  return _fs as typeof import('fs')
}

let _path: typeof import('path') | undefined
/**
 * Lazily load the path module to avoid Webpack errors.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    _path = /*@__PURE__*/ require('node:path')
  }
  return _path as typeof import('path')
}

let _os: typeof import('os') | undefined
/**
 * Lazily load the os module to avoid Webpack errors.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getOs() {
  if (_os === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    _os = /*@__PURE__*/ require('node:os')
  }
  return _os as typeof import('os')
}

/**
 * Process directory entries and filter for directories.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function innerReadDirNames(
  dirents: Dirent[],
  dirname: string | undefined,
  options?: ReadDirOptions | undefined,
): string[] {
  const {
    ignore,
    includeEmpty = true,
    sort = true,
  } = { __proto__: null, ...options } as ReadDirOptions
  const path = getPath()
  const names = dirents
    .filter(
      (d: Dirent) =>
        d.isDirectory() &&
        (includeEmpty ||
          !isDirEmptySync(path.join(dirname || d.parentPath, d.name), {
            ignore,
          })),
    )
    .map((d: Dirent) => d.name)
  return sort ? names.sort(naturalCompare) : names
}

/**
 * Stringify JSON with custom formatting options.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function stringify(
  json: unknown,
  EOL: string,
  finalEOL: boolean,
  replacer: JsonReviver | undefined,
  spaces: number | string = 2,
): string {
  const EOF = finalEOL ? EOL : ''
  const str = JSON.stringify(json, replacer, spaces)
  return `${str.replace(/\n/g, EOL)}${EOF}`
}

/**
 * Find a file or directory by traversing up parent directories.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function findUp(
  name: string | string[] | readonly string[],
  options?: FindUpOptions | undefined,
): Promise<string | undefined> {
  const { cwd = process.cwd(), signal = abortSignal } = {
    __proto__: null,
    ...options,
  } as FindUpOptions
  let { onlyDirectories = false, onlyFiles = true } = {
    __proto__: null,
    ...options,
  } as FindUpOptions
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
  const names = isArray(name) ? name : [name as string]
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
          return normalizePath(thePath)
        }
        if (!onlyFiles && stats.isDirectory()) {
          return normalizePath(thePath)
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
export function findUpSync(
  name: string | string[] | readonly string[],
  options?: FindUpSyncOptions | undefined,
) {
  const { cwd = process.cwd(), stopAt } = {
    __proto__: null,
    ...options,
  } as FindUpSyncOptions
  let { onlyDirectories = false, onlyFiles = true } = {
    __proto__: null,
    ...options,
  } as FindUpSyncOptions
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
  const names = isArray(name) ? name : [name as string]
  while (dir && dir !== root) {
    // Check if we should stop at this directory.
    if (stopDir && dir === stopDir) {
      // Check current directory but don't go up.
      for (const n of names) {
        const thePath = path.join(dir, n)
        try {
          const stats = fs.statSync(thePath)
          if (!onlyDirectories && stats.isFile()) {
            return normalizePath(thePath)
          }
          if (!onlyFiles && stats.isDirectory()) {
            return normalizePath(thePath)
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
          return normalizePath(thePath)
        }
        if (!onlyFiles && stats.isDirectory()) {
          return normalizePath(thePath)
        }
      } catch {}
    }
    dir = path.dirname(dir)
  }
  return undefined
}

/**
 * Check if a path is a directory asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function isDir(filepath: PathLike) {
  return !!(await safeStats(filepath))?.isDirectory()
}

/**
 * Check if a path is a directory synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isDirSync(filepath: PathLike) {
  return !!safeStatsSync(filepath)?.isDirectory()
}

/**
 * Check if a directory is empty synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isDirEmptySync(
  dirname: PathLike,
  options?: IsDirEmptyOptions | undefined,
) {
  const { ignore = defaultIgnore } = {
    __proto__: null,
    ...options,
  } as IsDirEmptyOptions
  const fs = getFs()
  try {
    const files = fs.readdirSync(dirname)
    const { length } = files
    if (length === 0) {
      return true
    }
    const matcher = getGlobMatcher(
      ignore as string[],
      {
        cwd: pathLikeToString(dirname),
      } as { cwd?: string; dot?: boolean; ignore?: string[]; nocase?: boolean },
    )
    let ignoredCount = 0
    for (let i = 0; i < length; i += 1) {
      const file = files[i]
      if (file && matcher(file)) {
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
export function isSymLinkSync(filepath: PathLike) {
  const fs = getFs()
  try {
    return fs.lstatSync(filepath).isSymbolicLink()
  } catch {}
  return false
}

/**
 * Read directory names asynchronously with filtering and sorting.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function readDirNames(
  dirname: PathLike,
  options?: ReadDirOptions | undefined,
) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      await fs.promises.readdir(dirname, {
        __proto__: null,
        encoding: 'utf8',
        withFileTypes: true,
      } as ObjectEncodingOptions & { withFileTypes: true }),
      String(dirname),
      options,
    )
  } catch {}
  return []
}

/**
 * Read directory names synchronously with filtering and sorting.
 */
/*@__NO_SIDE_EFFECTS__*/
export function readDirNamesSync(dirname: PathLike, options?: ReadDirOptions) {
  const fs = getFs()
  try {
    return innerReadDirNames(
      fs.readdirSync(dirname, {
        __proto__: null,
        encoding: 'utf8',
        withFileTypes: true,
      } as ObjectEncodingOptions & { withFileTypes: true }),
      String(dirname),
      options,
    )
  } catch {}
  return []
}

/**
 * Read a file as binary data asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function readFileBinary(
  filepath: PathLike,
  options?: ReadFileOptions | undefined,
) {
  // Don't specify encoding to get a Buffer.
  const opts = typeof options === 'string' ? { encoding: options } : options
  const fs = getFs()
  return await fs.promises.readFile(filepath, {
    signal: abortSignal,
    ...opts,
    encoding: null,
  })
}

/**
 * Read a file as UTF-8 text asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function readFileUtf8(
  filepath: PathLike,
  options?: ReadFileOptions | undefined,
) {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const fs = getFs()
  return await fs.promises.readFile(filepath, {
    signal: abortSignal,
    ...opts,
    encoding: 'utf8',
  })
}

/**
 * Read a file as binary data synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function readFileBinarySync(
  filepath: PathLike,
  options?: ReadFileOptions | undefined,
) {
  // Don't specify encoding to get a Buffer
  const opts = typeof options === 'string' ? { encoding: options } : options
  const fs = getFs()
  return fs.readFileSync(filepath, {
    ...opts,
    encoding: null,
  } as ObjectEncodingOptions)
}

/**
 * Read a file as UTF-8 text synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function readFileUtf8Sync(
  filepath: PathLike,
  options?: ReadFileOptions | undefined,
) {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const fs = getFs()
  return fs.readFileSync(filepath, {
    ...opts,
    encoding: 'utf8',
  } as ObjectEncodingOptions)
}

/**
 * Read and parse a JSON file asynchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function readJson(
  filepath: PathLike,
  options?: ReadJsonOptions | string | undefined,
) {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const { reviver, throws, ...fsOptions } = {
    __proto__: null,
    ...opts,
  } as unknown as ReadJsonOptions
  const shouldThrow = throws === undefined || !!throws
  const fs = getFs()
  let content = ''
  try {
    content = await fs.promises.readFile(filepath, {
      __proto__: null,
      encoding: 'utf8',
      ...fsOptions,
    } as unknown as Parameters<typeof fs.promises.readFile>[1] & {
      encoding: string
    })
  } catch (e) {
    if (shouldThrow) {
      throw e
    }
    return undefined
  }
  return jsonParse(content, {
    filepath: String(filepath),
    reviver,
    throws: shouldThrow,
  })
}

/**
 * Read and parse a JSON file synchronously.
 */
/*@__NO_SIDE_EFFECTS__*/
export function readJsonSync(
  filepath: PathLike,
  options?: ReadJsonOptions | string | undefined,
) {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const { reviver, throws, ...fsOptions } = {
    __proto__: null,
    ...opts,
  } as unknown as ReadJsonOptions
  const shouldThrow = throws === undefined || !!throws
  const fs = getFs()
  let content = ''
  try {
    content = fs.readFileSync(filepath, {
      __proto__: null,
      encoding: 'utf8',
      ...fsOptions,
    } as unknown as Parameters<typeof fs.readFileSync>[1] & {
      encoding: string
    })
  } catch (e) {
    if (shouldThrow) {
      throw e
    }
    return undefined
  }
  return jsonParse(content, {
    filepath: String(filepath),
    reviver,
    throws: shouldThrow,
  })
}

/**
 * Safely delete a file or directory asynchronously with built-in protections.
 * Uses `del` for safer deletion that prevents removing cwd and above by default.
 * Automatically uses force: true for temp directory, cacache, and ~/.socket subdirectories.
 * @throws {Error} When attempting to delete protected paths without force option.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function safeDelete(
  filepath: PathLike | PathLike[],
  options?: RemoveOptions | undefined,
) {
  const del = /*@__PURE__*/ require('../external/del')
  const { deleteAsync } = del
  const opts = { __proto__: null, ...options } as RemoveOptions
  const patterns = isArray(filepath)
    ? filepath.map(pathLikeToString)
    : [pathLikeToString(filepath)]

  // Check if we're deleting within allowed directories.
  let shouldForce = opts.force !== false
  if (!shouldForce && patterns.length > 0) {
    const os = getOs()
    const path = getPath()
    const {
      getSocketCacacheDir,
      getSocketUserDir,
    } = /*@__PURE__*/ require('./paths')

    // Get allowed directories
    const tmpDir = os.tmpdir()
    const resolvedTmpDir = path.resolve(tmpDir)
    const cacacheDir = getSocketCacacheDir()
    const resolvedCacacheDir = path.resolve(cacacheDir)
    const socketUserDir = getSocketUserDir()
    const resolvedSocketUserDir = path.resolve(socketUserDir)

    // Check if all patterns are within allowed directories.
    const allInAllowedDirs = patterns.every(pattern => {
      const resolvedPath = path.resolve(pattern)

      // Check each allowed directory
      for (const allowedDir of [
        resolvedTmpDir,
        resolvedCacacheDir,
        resolvedSocketUserDir,
      ]) {
        const isInAllowedDir =
          resolvedPath.startsWith(allowedDir + path.sep) ||
          resolvedPath === allowedDir
        const relativePath = path.relative(allowedDir, resolvedPath)
        const isGoingBackward = relativePath.startsWith('..')

        if (isInAllowedDir && !isGoingBackward) {
          return true
        }
      }

      return false
    })

    if (allInAllowedDirs) {
      shouldForce = true
    }
  }

  await deleteAsync(patterns, {
    concurrency: opts.maxRetries || defaultRemoveOptions.maxRetries,
    dryRun: false,
    force: shouldForce,
    onlyFiles: false,
  })
}

/**
 * Safely delete a file or directory synchronously with built-in protections.
 * Uses `del` for safer deletion that prevents removing cwd and above by default.
 * Automatically uses force: true for temp directory, cacache, and ~/.socket subdirectories.
 * @throws {Error} When attempting to delete protected paths without force option.
 */
/*@__NO_SIDE_EFFECTS__*/
export function safeDeleteSync(
  filepath: PathLike | PathLike[],
  options?: RemoveOptions | undefined,
) {
  const del = /*@__PURE__*/ require('../external/del')
  const { deleteSync } = del
  const opts = { __proto__: null, ...options } as RemoveOptions
  const patterns = isArray(filepath)
    ? filepath.map(pathLikeToString)
    : [pathLikeToString(filepath)]

  // Check if we're deleting within allowed directories.
  let shouldForce = opts.force !== false
  if (!shouldForce && patterns.length > 0) {
    const os = getOs()
    const path = getPath()
    const {
      getSocketCacacheDir,
      getSocketUserDir,
    } = /*@__PURE__*/ require('./paths')

    // Get allowed directories
    const tmpDir = os.tmpdir()
    const resolvedTmpDir = path.resolve(tmpDir)
    const cacacheDir = getSocketCacacheDir()
    const resolvedCacacheDir = path.resolve(cacacheDir)
    const socketUserDir = getSocketUserDir()
    const resolvedSocketUserDir = path.resolve(socketUserDir)

    // Check if all patterns are within allowed directories.
    const allInAllowedDirs = patterns.every(pattern => {
      const resolvedPath = path.resolve(pattern)

      // Check each allowed directory
      for (const allowedDir of [
        resolvedTmpDir,
        resolvedCacacheDir,
        resolvedSocketUserDir,
      ]) {
        const isInAllowedDir =
          resolvedPath.startsWith(allowedDir + path.sep) ||
          resolvedPath === allowedDir
        const relativePath = path.relative(allowedDir, resolvedPath)
        const isGoingBackward = relativePath.startsWith('..')

        if (isInAllowedDir && !isGoingBackward) {
          return true
        }
      }

      return false
    })

    if (allInAllowedDirs) {
      shouldForce = true
    }
  }

  deleteSync(patterns, {
    concurrency: opts.maxRetries || defaultRemoveOptions.maxRetries,
    dryRun: false,
    force: shouldForce,
    onlyFiles: false,
  })
}

/**
 * Safely read a file asynchronously, returning undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function safeReadFile(
  filepath: PathLike,
  options?: SafeReadOptions | undefined,
) {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const fs = getFs()
  try {
    return await fs.promises.readFile(filepath, {
      signal: abortSignal,
      ...opts,
    } as Abortable)
  } catch {}
  return undefined
}

/**
 * Safely get file stats asynchronously, returning undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function safeStats(filepath: PathLike) {
  const fs = getFs()
  try {
    return await fs.promises.stat(filepath)
  } catch {}
  return undefined
}

/**
 * Safely get file stats synchronously, returning undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
export function safeStatsSync(
  filepath: PathLike,
  options?: ReadFileOptions | undefined,
) {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const fs = getFs()
  try {
    return fs.statSync(filepath, {
      __proto__: null,
      throwIfNoEntry: false,
      ...opts,
    } as StatSyncOptions)
  } catch {}
  return undefined
}

/**
 * Safely read a file synchronously, returning undefined on error.
 */
/*@__NO_SIDE_EFFECTS__*/
export function safeReadFileSync(
  filepath: PathLike,
  options?: SafeReadOptions | undefined,
) {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const fs = getFs()
  try {
    return fs.readFileSync(filepath, {
      __proto__: null,
      ...opts,
    } as ObjectEncodingOptions)
  } catch {}
  return undefined
}

/**
 * Generate a unique filepath by adding number suffix if the path exists.
 */
/*@__NO_SIDE_EFFECTS__*/
export function uniqueSync(filepath: PathLike): string {
  const fs = getFs()
  const path = getPath()
  const filepathStr = String(filepath)

  // If the file doesn't exist, return as is
  if (!fs.existsSync(filepathStr)) {
    return normalizePath(filepathStr)
  }

  const dirname = path.dirname(filepathStr)
  const ext = path.extname(filepathStr)
  const basename = path.basename(filepathStr, ext)

  let counter = 1
  let uniquePath: string
  do {
    uniquePath = path.join(dirname, `${basename}-${counter}${ext}`)
    counter++
  } while (fs.existsSync(uniquePath))

  return normalizePath(uniquePath)
}

/**
 * Write JSON content to a file asynchronously with formatting.
 */
/*@__NO_SIDE_EFFECTS__*/
export async function writeJson(
  filepath: PathLike,
  jsonContent: unknown,
  options?: WriteJsonOptions | string,
): Promise<void> {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const { EOL, finalEOL, replacer, spaces, ...fsOptions } = {
    __proto__: null,
    ...opts,
  } as WriteJsonOptions
  const fs = getFs()
  const jsonString = stringify(
    jsonContent,
    EOL || '\n',
    finalEOL !== undefined ? finalEOL : true,
    replacer,
    spaces,
  )
  await fs.promises.writeFile(filepath, jsonString, {
    encoding: 'utf8',
    ...fsOptions,
    __proto__: null,
  } as ObjectEncodingOptions)
}

/**
 * Write JSON content to a file synchronously with formatting.
 */
/*@__NO_SIDE_EFFECTS__*/
export function writeJsonSync(
  filepath: PathLike,
  jsonContent: unknown,
  options?: WriteJsonOptions | string | undefined,
): void {
  const opts = typeof options === 'string' ? { encoding: options } : options
  const { EOL, finalEOL, replacer, spaces, ...fsOptions } = {
    __proto__: null,
    ...opts,
  }
  const fs = getFs()
  const jsonString = stringify(
    jsonContent,
    EOL || '\n',
    finalEOL !== undefined ? finalEOL : true,
    replacer,
    spaces,
  )
  fs.writeFileSync(filepath, jsonString, {
    encoding: 'utf8',
    ...fsOptions,
    __proto__: null,
  } as WriteFileOptions)
}
