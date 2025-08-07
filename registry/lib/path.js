'use strict'

const { search } = /*@__PURE__*/ require('./strings')

const leadingDotSlashRegExp = /^\.\.?[/\\]/
const slashRegExp = /[/\\]/
const nodeModulesPathRegExp = /(?:^|[/\\])node_modules(?:[/\\]|$)/

let _buffer
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
/*@__NO_SIDE_EFFECTS__*/
function getUrl() {
  if (_url === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _url = /*@__PURE__*/ require('url')
  }
  return _url
}

/*@__NO_SIDE_EFFECTS__*/
function isNodeModules(pathLike) {
  const filepath = pathLikeToString(pathLike)
  return nodeModulesPathRegExp.test(filepath)
}

/*@__NO_SIDE_EFFECTS__*/
function isPath(pathLike) {
  return isRelative(pathLike) || getPath().isAbsolute(pathLike)
}

/*@__NO_SIDE_EFFECTS__*/
function isRelative(pathLike) {
  const filepath = pathLikeToString(pathLike)
  if (typeof filepath !== 'string') {
    return false
  }
  const { length } = filepath
  if (length === 0) {
    return false
  }
  if (filepath.charCodeAt(0) === 46 /*'.'*/) {
    if (length === 1) {
      return true
    }
    let code = filepath.charCodeAt(1)
    if (code === 46 /*'.'*/) {
      code = filepath.charCodeAt(2)
    }
    return code === 47 /*'/'*/ || code === 92 /*'\\'*/
  }
  return false
}

/*@__NO_SIDE_EFFECTS__*/
function normalizePath(pathLike) {
  const filepath = pathLikeToString(pathLike)
  const { length } = filepath
  if (length < 2) {
    return length === 1 && filepath.charCodeAt(0) === 92 /*'\\'*/
      ? '/'
      : filepath
  }

  let code = 0
  let collapsed = ''
  let start = 0

  // Ensure win32 namespaces have two leading slashes so they are handled properly
  // by path.win32.parse() after being normalized.
  // https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#namespaces
  // UNC paths, paths starting with double slashes, e.g. "\\\\wsl.localhost\\Ubuntu\home\\",
  // are okay to convert to forward slashes.
  // https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
  let prefix = ''
  if (length > 4 && filepath.charCodeAt(3) === 92 /*'\\'*/) {
    const code2 = filepath.charCodeAt(2)
    // Look for \\?\ or \\.\
    if (
      (code2 === 63 /*'?'*/ || code2 === 46) /*'.'*/ &&
      filepath.charCodeAt(0) === 92 /*'\\'*/ &&
      filepath.charCodeAt(1) === 92 /*'\\'*/
    ) {
      start = 2
      prefix = '//'
    }
  }
  if (start === 0) {
    // Trim leading slashes
    while (
      ((code = filepath.charCodeAt(start)),
      code === 47 /*'/'*/ || code === 92) /*'\\'*/
    ) {
      start += 1
    }
    if (start) {
      prefix = '/'
    }
  }
  let nextIndex = search(filepath, slashRegExp, start)
  if (nextIndex === -1) {
    return prefix + filepath.slice(start)
  }
  // Discard any empty string segments by collapsing repeated segment separator slashes.
  while (nextIndex !== -1) {
    const segment = filepath.slice(start, nextIndex)
    collapsed = collapsed + (collapsed.length === 0 ? '' : '/') + segment
    start = nextIndex + 1
    while (
      ((code = filepath.charCodeAt(start)),
      code === 47 /*'/'*/ || code === 92) /*'\\'*/
    ) {
      start += 1
    }
    nextIndex = search(filepath, slashRegExp, start)
  }
  const lastSegment = filepath.slice(start)
  if (lastSegment.length !== 0) {
    collapsed = collapsed + '/' + lastSegment
  }
  return prefix + collapsed
}

/*@__NO_SIDE_EFFECTS__*/
function pathLikeToString(pathLike) {
  if (typeof pathLike === 'string') {
    return pathLike
  }
  const Buffer = getBuffer()
  if (Buffer.isBuffer(pathLike)) {
    return pathLike.toString('utf8')
  }
  const url = getUrl()
  if (pathLike instanceof URL) {
    return url.fileURLToPath(pathLike)
  }
  return String(pathLike)
}

/*@__NO_SIDE_EFFECTS__*/
function splitPath(pathLike) {
  const filepath = pathLikeToString(pathLike)
  return filepath.split(slashRegExp)
}

/*@__NO_SIDE_EFFECTS__*/
function trimLeadingDotSlash(pathLike) {
  const filepath = pathLikeToString(pathLike)
  return filepath.replace(leadingDotSlashRegExp, '')
}

module.exports = {
  isNodeModules,
  isPath,
  isRelative,
  normalizePath,
  pathLikeToString,
  splitPath,
  trimLeadingDotSlash
}
