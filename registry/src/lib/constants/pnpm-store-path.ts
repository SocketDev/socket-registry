/**
 * @fileoverview File system path to the PNPM package store directory.
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

// PNPM store path - the global package store location.
// By default:
// - macOS: ~/Library/pnpm/store
// - Linux: ~/.local/share/pnpm/store (or $XDG_DATA_HOME/pnpm/store if set)
// - Windows: %LOCALAPPDATA%/pnpm/store
//
// Can be overridden by:
// - PNPM_HOME environment variable
// - pnpm config store-dir setting
// - .npmrc store-dir setting
//
// Documentation: https://pnpm.io/npmrc#store-dir
function getPnpmStorePath() {
  const path = getPath()
  // Check for explicit PNPM_HOME environment variable.
  const pnpmHome = process.env.PNPM_HOME
  if (pnpmHome) {
    return normalizePath(path.join(pnpmHome, 'store'))
  }

  if (WIN32) {
    // On Windows, use LOCALAPPDATA.
    if (!ENV.LOCALAPPDATA) {
      return ''
    }
    return normalizePath(path.join(ENV.LOCALAPPDATA, 'pnpm', 'store'))
  }

  // On Unix-like systems, follow XDG Base Directory specification.
  if (ENV.XDG_DATA_HOME) {
    return normalizePath(path.join(ENV.XDG_DATA_HOME, 'pnpm', 'store'))
  }

  // macOS default location.
  if (process.platform === 'darwin' && ENV.HOME) {
    return normalizePath(path.join(ENV.HOME, 'Library', 'pnpm', 'store'))
  }

  // Linux/Unix default location.
  if (!ENV.HOME) {
    return ''
  }
  return normalizePath(path.join(ENV.HOME, '.local', 'share', 'pnpm', 'store'))
}

export default getPnpmStorePath()
