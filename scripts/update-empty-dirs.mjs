/**
 * @fileoverview Removes empty directories from the project.
 * Scans the entire project tree (excluding node_modules) and removes
 * any empty directories found. Processes directories from deepest to
 * shallowest to catch newly emptied parent directories.
 */

import fastGlob from 'fast-glob'

import { isDirEmptySync } from '../registry/dist/lib/fs.js'
import { logger } from '../registry/dist/lib/logger.js'

import constants from './constants.mjs'
import { safeRemove } from './utils/fs.mjs'

const { NODE_MODULES_GLOB_RECURSIVE } = constants

async function main() {
  const dirPaths = (
    await fastGlob.glob(['**/'], {
      ignore: [NODE_MODULES_GLOB_RECURSIVE],
      absolute: true,
      cwd: constants.rootPath,
      onlyDirectories: true,
    })
  )
    // Sort directory paths longest to shortest.
    .sort((a, b) => b.length - a.length)

  // Collect all empty directories.
  const emptyDirs = dirPaths.filter(dirPath => isDirEmptySync(dirPath))

  // Remove them all at once if there are any.
  if (emptyDirs.length) {
    await safeRemove(emptyDirs)
    logger.log(`Removed ${emptyDirs.length} empty directories`)
  }
}

main().catch(console.error)
