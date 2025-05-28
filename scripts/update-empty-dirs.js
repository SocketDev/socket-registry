'use strict'

const { glob: tinyGlob } = require('tinyglobby')

const {
  NODE_MODULES_GLOB_RECURSIVE,
  rootPath
} = require('@socketregistry/scripts/constants')
const { isDirEmptySync, remove } = require('@socketsecurity/registry/lib/fs')

void (async () => {
  const dirPaths = (
    await tinyGlob(['**/'], {
      ignore: [NODE_MODULES_GLOB_RECURSIVE],
      absolute: true,
      cwd: rootPath,
      onlyDirectories: true
    })
  )
    // Sort directory paths longest to shortest.
    .sort((a, b) => b.length - a.length)
  for (const dirPath of dirPaths) {
    if (isDirEmptySync(dirPath)) {
      // eslint-disable-next-line no-await-in-loop
      await remove(dirPath)
    }
  }
})()
