import path from 'node:path'

import { normalizePath } from '../path'
import ENV from './ENV'
import WIN32 from './WIN32'

// Yarn cache directory paths.
// Yarn Classic (v1) and Yarn Berry (v2+) use different cache locations.
//
// Yarn Classic (v1):
// - macOS/Linux: ~/.cache/yarn
// - Windows: %LOCALAPPDATA%/Yarn/Cache
//
// Yarn Berry (v2+):
// - Uses .yarn/cache in the project directory by default
// - Can be configured via yarnPath in .yarnrc.yml
//
// Can be overridden by:
// - YARN_CACHE_FOLDER environment variable (Classic)
// - cacheFolder setting in .yarnrc.yml (Berry)
//
// Documentation:
// - Classic: https://classic.yarnpkg.com/en/docs/cli/cache
// - Berry: https://yarnpkg.com/configuration/yarnrc#cacheFolder
function getYarnCachePaths() {
  const paths = {
    __proto__: null,
    classic: '',
    berry: '.yarn/cache',
  }

  // Check for explicit YARN_CACHE_FOLDER environment variable (Yarn Classic).
  const yarnCacheFolder = process.env['YARN_CACHE_FOLDER']
  if (yarnCacheFolder) {
    paths.classic = normalizePath(yarnCacheFolder)
    return paths
  }

  if (WIN32) {
    // On Windows, Yarn Classic uses LOCALAPPDATA.
    if (ENV.LOCALAPPDATA) {
      paths.classic = normalizePath(
        path.join(ENV.LOCALAPPDATA, 'Yarn', 'Cache'),
      )
    }
  } else {
    // On Unix-like systems, Yarn Classic uses ~/.cache/yarn.
    if (ENV.HOME) {
      paths.classic = normalizePath(path.join(ENV.HOME, '.cache', 'yarn'))
    }
  }

  return paths
}

export default getYarnCachePaths()
