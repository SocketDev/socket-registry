import path from 'node:path'

import ENV from './ENV'
import WIN32 from './WIN32'

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
  // Check for explicit PNPM_HOME environment variable.
  const pnpmHome = process.env['PNPM_HOME']
  if (pnpmHome) {
    return path.join(pnpmHome, 'store')
  }

  if (WIN32) {
    // On Windows, use LOCALAPPDATA.
    return ENV.LOCALAPPDATA ? path.join(ENV.LOCALAPPDATA, 'pnpm', 'store') : ''
  }

  // On Unix-like systems, follow XDG Base Directory specification.
  if (ENV.XDG_DATA_HOME) {
    return path.join(ENV.XDG_DATA_HOME, 'pnpm', 'store')
  }

  // macOS default location.
  if (process.platform === 'darwin' && ENV.HOME) {
    return path.join(ENV.HOME, 'Library', 'pnpm', 'store')
  }

  // Linux/Unix default location.
  return ENV.HOME ? path.join(ENV.HOME, '.local', 'share', 'pnpm', 'store') : ''
}

export default getPnpmStorePath()
