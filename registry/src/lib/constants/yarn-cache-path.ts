import path from 'node:path'

import ENV from './ENV.js'
import WIN32 from './WIN32.js'

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
    paths.classic = yarnCacheFolder
    return paths
  }

  if (WIN32) {
    // On Windows, Yarn Classic uses LOCALAPPDATA.
    paths.classic = ENV.LOCALAPPDATA
      ? path.join(ENV.LOCALAPPDATA, 'Yarn', 'Cache')
      : ''
  } else {
    // On Unix-like systems, Yarn Classic uses ~/.cache/yarn.
    paths.classic = ENV.HOME ? path.join(ENV.HOME, '.cache', 'yarn') : ''
  }

  return paths
}

export default getYarnCachePaths()
