'use strict'

const path = require('node:path')
const ENV = /*@__PURE__*/ require('./env')
const WIN32 = /*@__PURE__*/ require('./win32')

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
  const bunCacheDir = process.env.BUN_INSTALL_CACHE_DIR
  if (bunCacheDir) {
    return bunCacheDir
  }

  if (WIN32) {
    // On Windows, Bun uses TEMP directory.
    const temp = process.env.TEMP || process.env.TMP
    return temp ? path.join(temp, 'bun') : ''
  }

  // On macOS, use Library/Caches.
  if (process.platform === 'darwin' && ENV.HOME) {
    return path.join(ENV.HOME, 'Library', 'Caches', 'bun')
  }

  // On Linux/Unix, use ~/.bun/install/cache.
  return ENV.HOME ? path.join(ENV.HOME, '.bun', 'install', 'cache') : ''
}

module.exports = getBunCachePath()
