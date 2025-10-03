import path from 'node:path'

import { normalizePath } from '../path'
import ENV from './ENV'
import WIN32 from './WIN32'

// Yarn cache directory path.
// Returns the Yarn Classic (v1) cache location.
//
// Yarn Classic (v1):
// - macOS/Linux: ~/.cache/yarn
// - Windows: %LOCALAPPDATA%/Yarn/Cache
//
// Can be overridden by:
// - YARN_CACHE_FOLDER environment variable
//
// Documentation:
// - Classic: https://classic.yarnpkg.com/en/docs/cli/cache
function getYarnCachePath() {
  // Check for explicit YARN_CACHE_FOLDER environment variable (Yarn Classic).
  const yarnCacheFolder = process.env['YARN_CACHE_FOLDER']
  if (yarnCacheFolder) {
    return normalizePath(yarnCacheFolder)
  }

  if (WIN32) {
    // On Windows, Yarn Classic uses LOCALAPPDATA.
    if (!ENV.LOCALAPPDATA) {
      return ''
    }
    return normalizePath(path.join(ENV.LOCALAPPDATA, 'Yarn', 'Cache'))
  }

  // On Unix-like systems, Yarn Classic uses ~/.cache/yarn.
  if (!ENV.HOME) {
    return ''
  }
  return normalizePath(path.join(ENV.HOME, '.cache', 'yarn'))
}

export default getYarnCachePath()
