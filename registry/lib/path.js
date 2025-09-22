'use strict'

// Removed unused imports.
const slashRegExp = /[/\\]/
const nodeModulesPathRegExp = /(?:^|[/\\])node_modules(?:[/\\]|$)/

let _buffer
/**
 * Lazily load the buffer module.
 * @returns {import('buffer')} The Node.js buffer module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getBuffer() {
  if (_buffer === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _buffer = /*@__PURE__*/ require('buffer')
  }
  return _buffer
}

let _path
/**
 * Lazily load the path module.
 * @returns {import('path')} The Node.js path module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path
}

let _url
/**
 * Lazily load the url module.
 * @returns {import('url')} The Node.js url module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getUrl() {
  if (_url === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _url = /*@__PURE__*/ require('url')
  }
  return _url
}

/**
 * Check if a path contains node_modules directory.
 * @param {string | Buffer | URL} pathLike - The path to check.
 * @returns {boolean} True if the path contains node_modules.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNodeModules(pathLike) {
  const filepath = pathLikeToString(pathLike)
  return nodeModulesPathRegExp.test(filepath)
}

/**
 * Check if a value is a valid file path (absolute or relative).
 * @param {any} pathLike - The value to check.
 * @returns {boolean} True if the value is a valid path.
 */
/*@__NO_SIDE_EFFECTS__*/
function isPath(pathLike) {
  const filepath = pathLikeToString(pathLike)
  if (typeof filepath !== 'string' || filepath.length === 0) {
    return false
  }

  // Special case for npm package names (not paths)
  if (filepath.startsWith('@') && !filepath.startsWith('@/')) {
    // This looks like a scoped package name
    const parts = filepath.split('/')
    if (parts.length <= 2 && !parts[1]?.includes('\\')) {
      return false
    }
  }

  // Single names without path separators (like 'package-name') are not paths
  if (
    !filepath.includes('/') &&
    !filepath.includes('\\') &&
    filepath !== '.' &&
    filepath !== '..' &&
    !getPath().isAbsolute(filepath)
  ) {
    return false
  }

  // Check if it looks like a path
  return (
    filepath.includes('/') ||
    filepath.includes('\\') ||
    filepath === '.' ||
    filepath === '..' ||
    getPath().isAbsolute(filepath)
  )
}

/**
 * Check if a path is relative (starts with . or ..).
 * @param {any} pathLike - The path to check.
 * @returns {boolean} True if the path is relative.
 */
/*@__NO_SIDE_EFFECTS__*/
function isRelative(pathLike) {
  const filepath = pathLikeToString(pathLike)
  if (typeof filepath !== 'string') {
    return false
  }
  // Empty string is considered relative.
  if (filepath.length === 0) {
    return true
  }
  // A path is relative if it's not absolute.
  return !getPath().isAbsolute(filepath)
}

/**
 * Normalize a path by converting backslashes to forward slashes and collapsing segments.
 * @param {string | Buffer | URL} pathLike - The path to normalize.
 * @returns {string} The normalized path.
 */
/*@__NO_SIDE_EFFECTS__*/
function normalizePath(pathLike) {
  const filepath = pathLikeToString(pathLike)
  if (filepath === '') {
    return '.'
  }

  // Use Node.js path.posix.normalize for consistent forward slashes.
  const path = getPath()
  let normalized = path.posix.normalize(filepath.replace(/\\/g, '/'))

  // Remove trailing slashes unless it's the root.
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }

  return normalized
}

/**
 * Convert a path-like value to a string.
 * @param {string | Buffer | URL | any} pathLike - The path-like value to convert.
 * @returns {string} The path as a string.
 */
/*@__NO_SIDE_EFFECTS__*/
function pathLikeToString(pathLike) {
  if (pathLike === null || pathLike === undefined) {
    return ''
  }
  if (typeof pathLike === 'string') {
    return pathLike
  }
  const { Buffer } = getBuffer()
  if (Buffer.isBuffer(pathLike)) {
    return pathLike.toString('utf8')
  }
  const url = getUrl()
  if (pathLike instanceof URL) {
    return url.fileURLToPath(pathLike)
  }
  return String(pathLike)
}

/**
 * Split a path into an array of segments.
 * @param {string | Buffer | URL} pathLike - The path to split.
 * @returns {string[]} Array of path segments.
 */
/*@__NO_SIDE_EFFECTS__*/
function splitPath(pathLike) {
  const filepath = pathLikeToString(pathLike)
  if (filepath === '') {
    return []
  }
  return filepath.split(slashRegExp)
}

/**
 * Remove leading ./ or ../ from a path.
 * @param {string | Buffer | URL} pathLike - The path to trim.
 * @returns {string} The path without leading dot-slash.
 */
/*@__NO_SIDE_EFFECTS__*/
function trimLeadingDotSlash(pathLike) {
  const filepath = pathLikeToString(pathLike)
  // Only trim ./ not ../
  if (filepath.startsWith('./') || filepath.startsWith('.\\')) {
    return filepath.slice(2)
  }
  return filepath
}

/**
 * Get the relative path from one path to another.
 * @param {string} from - The source path.
 * @param {string} to - The target path.
 * @returns {string} The relative path.
 */
/*@__NO_SIDE_EFFECTS__*/
function relativeResolve(from, to) {
  return getPath().relative(from, to)
}

module.exports = {
  isNodeModules,
  isPath,
  isRelative,
  normalizePath,
  pathLikeToString,
  relativeResolve,
  splitPath,
  trimLeadingDotSlash
}
