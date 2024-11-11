'use strict'

const fs = require('node:fs/promises')

const constants = require('@socketregistry/scripts/constants')
const { LICENSE, LICENSE_CONTENT, rootPath } = constants
const { globLicenses } = require('@socketsecurity/registry/lib/globs')

void (async () => {
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
