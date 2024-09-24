'use strict'

const fs = require('fs-extra')

const {
  LICENSE,
  LICENSE_CONTENT,
  ignores,
  rootPath
} = require('@socketregistry/scripts/constants')
const { globLicenses } = require('@socketregistry/scripts/utils/glob')

;(async () => {
  await Promise.all(
    (
      await globLicenses(rootPath, {
        recursive: true,
        ignore: [LICENSE, ...ignores]
      })
    ).map(licensePath => fs.writeFile(licensePath, LICENSE_CONTENT, 'utf8'))
  )
})()
