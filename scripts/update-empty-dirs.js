'use strict'

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const {
  NODE_MODULES_GLOB_RECURSIVE,
  rootPath
} = require('@socketregistry/scripts/constants')
const { isDirEmptySync } = require('@socketregistry/scripts/utils/fs')

;(async () => {
  await Promise.all(
    (
      await tinyGlob(['**/'], {
        ignore: [NODE_MODULES_GLOB_RECURSIVE],
        absolute: true,
        cwd: rootPath,
        onlyDirectories: true
      })
    )
      .filter(isDirEmptySync)
      .map(d => fs.remove(d))
  )
})()
