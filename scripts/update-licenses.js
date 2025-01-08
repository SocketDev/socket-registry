'use strict'

const fs = require('node:fs/promises')

const constants = require('@socketregistry/scripts/constants')
const { globLicenses } = require('@socketsecurity/registry/lib/globs')

const { LICENSE, LICENSE_CONTENT, ignoreGlobs, rootPath } = constants

void (async () => {
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
