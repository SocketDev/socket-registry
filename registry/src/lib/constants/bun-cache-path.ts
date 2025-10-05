import path from 'node:path'

import { normalizePath } from '../path'
import ENV from './ENV'
import WIN32 from './WIN32'

// Bun cache directory path.
// Bun stores its cache in a platform-specific location.
//
// Default locations:
// - macOS: ~/Library/Caches/bun
// - Linux: ~/.bun/install/cache
// - Windows: %TEMP%/bun
//
// Can be overridden by:
// - BUN_INSTALL_CACHE_DIR environment variable
// - cache.dir setting in bunfig.toml
//
// Documentation: https://bun.sh/docs/runtime/bunfig#cache-dir
function getBunCachePath() {
  // Check for explicit BUN_INSTALL_CACHE_DIR environment variable.
  const bunCacheDir = process.env['BUN_INSTALL_CACHE_DIR']
  if (bunCacheDir) {
    return normalizePath(bunCacheDir)
  }

  if (WIN32) {
    // On Windows, Bun uses TEMP directory.
    if (!ENV.TMPDIR) {
      return ''
    }
    return normalizePath(path.join(ENV.TMPDIR, 'bun'))
  }

  // On macOS, use Library/Caches.
  if (process.platform === 'darwin' && ENV.HOME) {
    return normalizePath(path.join(ENV.HOME, 'Library', 'Caches', 'bun'))
  }

  // On Linux/Unix, use ~/.bun/install/cache.
  if (!ENV.HOME) {
    return ''
  }
  return normalizePath(path.join(ENV.HOME, '.bun', 'install', 'cache'))
}

export default getBunCachePath()
