/**
 * @fileoverview File system path to the VLT package manager cache directory.
 */

import { normalizePath } from '../path'
import ENV from './ENV'
import WIN32 from './WIN32'

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

// Vlt cache directory path.
// Vlt is a next-generation JavaScript package manager created by npm veterans.
//
// Default locations follow XDG base directory specifications:
// - macOS: ~/Library/Caches/vlt
// - Linux: ~/.cache/vlt (or $XDG_CACHE_HOME/vlt if set)
// - Windows: %LOCALAPPDATA%/vlt/Cache
//
// Can be overridden by:
// - --cache flag when running vlt commands
// - cache setting in vlt.json configuration file
//
// Documentation: https://docs.vlt.sh/cli/configuring
function getVltCachePath() {
  const path = getPath()
  // Note: vlt doesn't document a specific environment variable for cache override.
  // The cache location is configured via --cache flag or vlt.json config file.

  if (WIN32) {
    // On Windows, use LOCALAPPDATA following XDG pattern.
    if (!ENV.LOCALAPPDATA) {
      return ''
    }
    return normalizePath(path.join(ENV.LOCALAPPDATA, 'vlt', 'Cache'))
  }

  // On macOS, use Library/Caches.
  if (process.platform === 'darwin' && ENV.HOME) {
    return normalizePath(path.join(ENV.HOME, 'Library', 'Caches', 'vlt'))
  }

  // On Linux/Unix, follow XDG Base Directory specification.
  const xdgCacheHome = process.env.XDG_CACHE_HOME
  if (xdgCacheHome) {
    return normalizePath(path.join(xdgCacheHome, 'vlt'))
  }

  // Linux/Unix default location.
  if (!ENV.HOME) {
    return ''
  }
  return normalizePath(path.join(ENV.HOME, '.cache', 'vlt'))
}

export default getVltCachePath()
