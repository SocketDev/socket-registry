/**
 * @fileoverview Removes empty directories from the project.
 * Scans the entire project tree (excluding node_modules) and removes
 * any empty directories found. Processes directories from deepest to
 * shallowest to catch newly emptied parent directories.
 */
'use strict'

const { glob } = require('fast-glob')

const constants = require('@socketregistry/scripts/constants')
const { safeRemove } = require('@socketregistry/scripts/lib/safe-remove')
const { isDirEmptySync } = require('@socketsecurity/registry/lib/fs')
const { logger } = require('@socketsecurity/registry/lib/logger')

const { NODE_MODULES_GLOB_RECURSIVE } = constants

void (async () => {
  const dirPaths = (
    await glob(['**/'], {
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
})()
