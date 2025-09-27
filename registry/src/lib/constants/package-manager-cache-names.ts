'use strict'

const { freeze: ObjectFreeze } = Object

// Package manager cache directory names.
// These are the standard directory names used by each package manager
// for their cache storage. These names are consistent across platforms.
//
// npm: Uses .npm directory
// pnpm: Uses pnpm/store directory structure
// yarn classic: Uses yarn directory
// yarn berry: Uses .yarn/cache directory structure
// bun: Uses bun directory
// vlt: Uses vlt directory
//
// These constants are useful for:
// - Identifying cache directories in file systems
// - Creating gitignore patterns
// - Cleaning up cache directories
// - Detecting which package manager created a cache
module.exports = ObjectFreeze({
  __proto__: null,
  // npm cache directory name (usually in home directory as .npm).
  NPM_CACHE_DIR: '.npm',
  // pnpm store directory name.
  PNPM_STORE_DIR: 'pnpm',
  // Yarn Classic cache directory name.
  YARN_CLASSIC_CACHE_DIR: 'yarn',
  // Yarn Berry cache directory path relative to project.
  YARN_BERRY_CACHE_DIR: '.yarn/cache',
  // Bun cache directory name.
  BUN_CACHE_DIR: 'bun',
  // Vlt cache directory name.
  VLT_CACHE_DIR: 'vlt',
})
