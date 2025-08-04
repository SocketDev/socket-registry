'use strict'

const fs = require('node:fs/promises')

const constants = require('@socketregistry/scripts/constants')
const { globStreamLicenses } = require('@socketsecurity/registry/lib/globs')
const { parallelForEach } = require('@socketsecurity/registry/lib/streams')

const { LICENSE, LICENSE_CONTENT, UTF8, ignoreGlobs, rootPath } = constants

void (async () => {
  const stream = globStreamLicenses(rootPath, {
    recursive: true,
    ignoreOriginals: true,
    ignore: [LICENSE, 'scripts/templates', ...ignoreGlobs]
  })
  await parallelForEach(
    stream,
    licensePath => fs.writeFile(licensePath, LICENSE_CONTENT, UTF8),
    { concurrency: 8 }
  )
})()
