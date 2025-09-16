'use strict'

const { glob } = require('fast-glob')
const trash = require('trash')

const constants = require('@socketregistry/scripts/constants')
const { isDirEmptySync } = require('@socketsecurity/registry/lib/fs')

const { NODE_MODULES_GLOB_RECURSIVE } = constants

void (async () => {
  const dirPaths = (
    await glob(['**/'], {
      ignore: [NODE_MODULES_GLOB_RECURSIVE],
      absolute: true,
      cwd: constants.rootPath,
      onlyDirectories: true
    })
  )
    // Sort directory paths longest to shortest.
    .sort((a, b) => b.length - a.length)

  // Collect all empty directories.
  const emptyDirs = dirPaths.filter(dirPath => isDirEmptySync(dirPath))

  // Trash them all at once if there are any.
  if (emptyDirs.length) {
    await trash(emptyDirs)
  }
})()
