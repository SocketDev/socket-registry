'use strict'

const fs = require('node:fs/promises')

const constants = require('@socketregistry/scripts/constants')
const { globStreamLicenses } = require('@socketsecurity/registry/lib/globs')
const { parallelEach } = require('@socketsecurity/registry/lib/streams')

const { LICENSE, LICENSE_CONTENT, UTF8 } = constants

void (async () => {
  const stream = globStreamLicenses(constants.rootPath, {
    recursive: true,
    ignoreOriginals: true,
    ignore: [LICENSE, 'scripts/templates', ...constants.ignoreGlobs]
  })
  await parallelEach(
    stream,
    licensePath => fs.writeFile(licensePath, LICENSE_CONTENT, UTF8),
    { concurrency: 8 }
  )
})()
