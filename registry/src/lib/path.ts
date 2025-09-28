/**
 * @fileoverview Path manipulation utilities with cross-platform support.
 * Provides path normalization, validation, and file extension handling.
 */

const { search } = /*@__PURE__*/ require('./strings')

// Removed unused imports.
const slashRegExp = /[/\\]/
const nodeModulesPathRegExp = /(?:^|[/\\])node_modules(?:[/\\]|$)/

let _buffer: typeof import('node:buffer') | undefined
/**
 * Lazily load the buffer module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getBuffer() {
  if (_buffer === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _buffer = /*@__PURE__*/ require('buffer')
  }
  return _buffer!
}

let _path: typeof import('node:path') | undefined
/**
 * Lazily load the path module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path!
}

let _url: typeof import('node:url') | undefined
/**
 * Lazily load the url module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getUrl() {
  if (_url === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _url = /*@__PURE__*/ require('url')
  }
  return _url!
}

/**
 * Check if a path contains node_modules directory.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isNodeModules(pathLike: string | Buffer | URL): boolean {
  const filepath = pathLikeToString(pathLike)
  return nodeModulesPathRegExp.test(filepath)
}

/**
 * Check if a value is a valid file path (absolute or relative).
 */
/*@__NO_SIDE_EFFECTS__*/
export function isPath(pathLike: string | Buffer | URL): boolean {
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
 */
/*@__NO_SIDE_EFFECTS__*/
export function isRelative(pathLike: string | Buffer | URL): boolean {
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
 */
/*@__NO_SIDE_EFFECTS__*/
export function normalizePath(pathLike: string | Buffer | URL): string {
  const filepath = pathLikeToString(pathLike)
  const { length } = filepath
  if (length === 0) {
    return '.'
  }
  if (length < 2) {
    return length === 1 && filepath.charCodeAt(0) === 92 /*'\\'*/
      ? '/'
      : filepath
  }

  let code = 0
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
    // Check for UNC paths first (\\server\share or //server/share)
    // UNC paths must start with exactly two slashes, not more
    if (
      length > 2 &&
      ((filepath.charCodeAt(0) === 92 /*'\\'*/ &&
        filepath.charCodeAt(1) === 92 /*'\\'*/ &&
        filepath.charCodeAt(2) !== 92) /*'\\'*/ ||
        (filepath.charCodeAt(0) === 47 /*'/'*/ &&
          filepath.charCodeAt(1) === 47 /*'/'*/ &&
          filepath.charCodeAt(2) !== 47)) /*'/'*/
    ) {
      // Check if this is a valid UNC path: must have server/share format
      // Find the first segment (server name) and second segment (share name)
      let firstSegmentEnd = -1
      let hasSecondSegment = false

      // Skip leading slashes after the initial double slash
      let i = 2
      while (
        i < length &&
        (filepath.charCodeAt(i) === 47 /*'/'*/ ||
          filepath.charCodeAt(i) === 92) /*'\\'*/
      ) {
        i++
      }

      // Find the end of first segment (server name)
      while (i < length) {
        const char = filepath.charCodeAt(i)
        if (char === 47 /*'/'*/ || char === 92 /*'\\'*/) {
          firstSegmentEnd = i
          break
        }
        i++
      }

      if (firstSegmentEnd > 2) {
        // Skip slashes after server name
        i = firstSegmentEnd
        while (
          i < length &&
          (filepath.charCodeAt(i) === 47 /*'/'*/ ||
            filepath.charCodeAt(i) === 92) /*'\\'*/
        ) {
          i++
        }
        // Check if there's a share name (second segment)
        if (i < length) {
          hasSecondSegment = true
        }
      }

      if (firstSegmentEnd > 2 && hasSecondSegment) {
        // Valid UNC path - preserve double leading slashes
        start = 2
        prefix = '//'
      } else {
        // Just repeated slashes, treat as regular path
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
    } else {
      // Trim leading slashes for regular paths
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
  }
  let nextIndex = search(filepath, slashRegExp, start)
  if (nextIndex === -1) {
    const segment = filepath.slice(start)
    if (segment === '.' || segment.length === 0) {
      return prefix || '.'
    }
    if (segment === '..') {
      return prefix ? prefix.slice(0, -1) || '/' : '..'
    }
    return prefix + segment
  }
  // Process segments and handle '.', '..', and empty segments.
  let collapsed = ''
  let segmentCount = 0
  while (nextIndex !== -1) {
    const segment = filepath.slice(start, nextIndex)
    if (segment.length > 0 && segment !== '.') {
      if (segment === '..') {
        // Handle '..' by removing the last segment if possible.
        if (segmentCount > 0) {
          // Find the last separator and remove the last segment.
          const lastSeparatorIndex = collapsed.lastIndexOf('/')
          if (lastSeparatorIndex === -1) {
            // Only one segment, remove it entirely.
            collapsed = ''
            segmentCount = 0
          } else {
            collapsed = collapsed.slice(0, lastSeparatorIndex)
            segmentCount -= 1
          }
        } else if (!prefix) {
          // Preserve '..' for relative paths.
          collapsed = collapsed + (collapsed.length === 0 ? '' : '/') + segment
          segmentCount += 1
        }
      } else {
        collapsed = collapsed + (collapsed.length === 0 ? '' : '/') + segment
        segmentCount += 1
      }
    }
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
  if (lastSegment.length > 0 && lastSegment !== '.') {
    if (lastSegment === '..') {
      if (segmentCount > 0) {
        const lastSeparatorIndex = collapsed.lastIndexOf('/')
        if (lastSeparatorIndex === -1) {
          collapsed = ''
          segmentCount = 0
        } else {
          collapsed = collapsed.slice(0, lastSeparatorIndex)
          segmentCount -= 1
        }
      } else if (!prefix) {
        collapsed =
          collapsed + (collapsed.length === 0 ? '' : '/') + lastSegment
        segmentCount += 1
      }
    } else {
      collapsed = collapsed + (collapsed.length === 0 ? '' : '/') + lastSegment
      segmentCount += 1
    }
  }

  if (collapsed.length === 0) {
    return prefix || '.'
  }
  return prefix + collapsed
}

/**
 * Convert a path-like value to a string.
 */
/*@__NO_SIDE_EFFECTS__*/
export function pathLikeToString(
  pathLike: string | Buffer | URL | null | undefined,
): string {
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
    try {
      return url.fileURLToPath(pathLike)
    } catch {
      // On Windows, file URLs like `file:///C:/path` include drive letters.
      // If a file URL is missing its drive letter (malformed), fileURLToPath() throws an error.
      // This fallback extracts the pathname directly from the URL object.
      //
      // Example flows:
      // - Unix: file:///home/user → pathname '/home/user' → keep as-is
      // - Windows valid: file:///C:/path → handled by fileURLToPath()
      // - Windows invalid: file:///path → pathname '/path' → strips to 'path'
      const pathname = pathLike.pathname
      // URL pathnames always start with `/`.
      // On Windows, strip the leading slash only for malformed URLs that lack drive letters
      // (e.g., `/path` should be `path`, but `/C:/path` should be `C:/path`).
      // On Unix, keep the leading slash for absolute paths (e.g., `/home/user`).
      const WIN32 = /*@__PURE__*/ require('./constants/WIN32').default
      if (WIN32 && pathname.startsWith('/')) {
        // Check for drive letter pattern following Node.js source: /[a-zA-Z]:/
        // Character at index 1 should be a letter, character at index 2 should be ':'
        const letter = pathname.charCodeAt(1) | 0x20 // Convert to lowercase
        const hasValidDriveLetter =
          pathname.length >= 3 &&
          letter >= 97 &&
          letter <= 122 && // 'a' to 'z'
          pathname.charAt(2) === ':'

        if (!hasValidDriveLetter) {
          // On Windows, preserve Unix-style absolute paths that don't start with a drive letter.
          // Only strip the leading slash for truly malformed Windows paths.
          // Since fileURLToPath() failed, this is likely a valid Unix-style absolute path.
          return pathname
        }
      }
      return pathname
    }
  }
  return String(pathLike)
}

/**
 * Split a path into an array of segments.
 */
/*@__NO_SIDE_EFFECTS__*/
export function splitPath(pathLike: string | Buffer | URL): string[] {
  const filepath = pathLikeToString(pathLike)
  if (filepath === '') {
    return []
  }
  return filepath.split(slashRegExp)
}

/**
 * Remove leading ./ or ../ from a path.
 */
/*@__NO_SIDE_EFFECTS__*/
export function trimLeadingDotSlash(pathLike: string | Buffer | URL): string {
  const filepath = pathLikeToString(pathLike)
  // Only trim ./ not ../
  if (filepath.startsWith('./') || filepath.startsWith('.\\')) {
    return filepath.slice(2)
  }
  return filepath
}

/**
 * Get the relative path from one path to another.
 */
/*@__NO_SIDE_EFFECTS__*/
export function relativeResolve(from: string, to: string): string {
  return getPath().relative(from, to)
}
