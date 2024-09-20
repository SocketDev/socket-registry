'use strict'

const fs = require('fs-extra')
const { glob: tinyGlob } = require('tinyglobby')

const {
  LICENSE,
  LICENSE_CONTENT,
  LICENSE_GLOB_PATTERN,
  ignores,
  rootPath
} = require('@socketregistry/scripts/constants')

;(async () => {
  await Promise.all(
    (
      await tinyGlob([`**/${LICENSE_GLOB_PATTERN}`], {
        ignore: [LICENSE, ...ignores],
        absolute: true,
        cwd: rootPath
      })
    ).map(licensePath => fs.writeFile(licensePath, LICENSE_CONTENT, 'utf8'))
  )
})()
