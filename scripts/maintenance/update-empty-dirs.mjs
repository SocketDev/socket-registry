/**
 * @fileoverview Removes empty directories from the project.
 * Scans the entire project tree (excluding node_modules) and removes
 * any empty directories found. Processes directories from deepest to
 * shallowest to catch newly emptied parent directories.
 */

import { NODE_MODULES_GLOB_RECURSIVE } from '@socketsecurity/lib/paths/globs'
import { isDirEmptySync } from '@socketsecurity/lib/fs'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { deleteAsync as del } from 'del'
import fastGlob from 'fast-glob'

const logger = getDefaultLogger()

import { ROOT_PATH } from '../constants/paths.mjs'

async function main() {
  const dirPaths = (
    await fastGlob.glob(['**/'], {
      ignore: [NODE_MODULES_GLOB_RECURSIVE],
      absolute: true,
      cwd: ROOT_PATH,
      onlyDirectories: true,
    })
  )
    // Sort directory paths longest to shortest.
    .sort((a, b) => b.length - a.length)

  // Collect all empty directories.
  const emptyDirs = dirPaths.filter(dirPath => isDirEmptySync(dirPath))

  // Remove them all at once if there are any.
  if (emptyDirs.length) {
    await del(emptyDirs)
    logger.log(`Removed ${emptyDirs.length} empty directories`)
  }
}

main().catch(e => logger.error(e))
