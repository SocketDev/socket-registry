'use strict'

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const { rootPath } = require('@socketregistry/scripts/constants')
const { isDirEmptySync } = require('@socketregistry/scripts/utils/fs')

;(async () => {
  await Promise.all(
    (
      await tinyGlob(['**/'], {
        ignore: ['**/node_modules'],
        absolute: true,
        cwd: rootPath,
        onlyDirectories: true
      })
    )
      .filter(isDirEmptySync)
      .map(d => fs.remove(d))
  )
})()
