'use strict'

const fs = require('fs-extra')

const constants = require('@socketregistry/scripts/constants')
const { LICENSE, LICENSE_CONTENT, rootPath } = constants
const { globLicenses } = require('@socketregistry/scripts/utils/globs')

;(async () => {
  await Promise.all(
    (
      await globLicenses(rootPath, {
        recursive: true,
        ignoreOriginals: true,
        // Lazily access constants.ignoreGlobs.
        ignore: [LICENSE, 'scripts/templates', ...constants.ignoreGlobs]
      })
    ).map(licensePath => fs.writeFile(licensePath, LICENSE_CONTENT, 'utf8'))
  )
})()
