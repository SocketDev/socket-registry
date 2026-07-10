/**
 * @file Removes empty directories from the project. Scans the entire project
 *   tree (excluding node_modules) and removes any empty directories found.
 *   Processes directories from deepest to shallowest to catch newly emptied
 *   parent directories.
 */

import { NODE_MODULES_GLOB_RECURSIVE } from '@socketsecurity/lib-stable/paths/dirnames'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { deleteAsync as del } from 'del'
import fastGlob from 'fast-glob'
import { ROOT_PATH } from '../constants/paths.mts'
import { isDirEmptySync } from '@socketsecurity/lib-stable/fs/inspect'

const logger = getDefaultLogger()

async function main(): Promise<void> {
  const dirPaths = (
    await fastGlob.glob(['**/'], {
      ignore: [NODE_MODULES_GLOB_RECURSIVE],
      absolute: true,
      cwd: ROOT_PATH,
      onlyDirectories: true,
    })
  )
    // Sort directory paths longest to shortest.
    .toSorted((a, b) => b.length - a.length)

  // Collect all empty directories.
  const emptyDirs = dirPaths.filter(dirPath => isDirEmptySync(dirPath))

  // Remove them all at once if there are any.
  if (emptyDirs.length) {
    await del(emptyDirs)
    logger.log(`Removed ${emptyDirs.length} empty directories`)
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
