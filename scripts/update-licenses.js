'use strict'

const fs = require('fs-extra')

const {
  LICENSE,
  LICENSE_CONTENT,
  ignoreGlobs,
  rootPath
} = require('@socketregistry/scripts/constants')
const { globLicenses } = require('@socketregistry/scripts/utils/glob')

;(async () => {
  await Promise.all(
    (
      await globLicenses(rootPath, {
        recursive: true,
        ignoreOriginals: true,
        ignore: [LICENSE, 'scripts/templates', ...ignoreGlobs]
      })
    ).map(licensePath => fs.writeFile(licensePath, LICENSE_CONTENT, 'utf8'))
  )
})()
